var globalColor = d3.interpolateViridis,
    clusters = {},
    charts = [],
    medoids = {};



var floor = Math.floor,
    abs = Math.abs;

function largestTriangleThreeBuckets(data, threshold) {

    var data_length = data.length;
    if (threshold >= data_length || threshold === 0) {
        return data; // Nothing to do
    }

    var sampled = [],
        sampled_index = 0;

    // Bucket size. Leave room for start and end data points
    var every = (data_length - 2) / (threshold - 2);

    var a = 0, // Initially a is the first point in the triangle
        max_area_point,
        max_area,
        area,
        next_a;

    sampled[sampled_index++] = data[a]; // Always add the first point

    for (var i = 0; i < threshold - 2; i++) {

        // Calculate point average for next bucket (containing c)
        var avg_x = 0,
            avg_y = 0,
            avg_range_start = floor((i + 1) * every) + 1,
            avg_range_end = floor((i + 2) * every) + 1;
        avg_range_end = avg_range_end < data_length ? avg_range_end : data_length;

        var avg_range_length = avg_range_end - avg_range_start;

        for (; avg_range_start < avg_range_end; avg_range_start++) {
            avg_x += data[avg_range_start][0] * 1; // * 1 enforces Number (value may be Date)
            avg_y += data[avg_range_start][1] * 1;
        }
        avg_x /= avg_range_length;
        avg_y /= avg_range_length;

        // Get the range for this bucket
        var range_offs = floor((i + 0) * every) + 1,
            range_to = floor((i + 1) * every) + 1;

        // Point a
        var point_a_x = data[a][0] * 1, // enforce Number (value may be Date)
            point_a_y = data[a][1] * 1;

        max_area = area = -1;

        for (; range_offs < range_to; range_offs++) {
            // Calculate triangle area over three buckets
            area = abs((point_a_x - avg_x) * (data[range_offs][1] - point_a_y) -
                (point_a_x - data[range_offs][0]) * (avg_y - point_a_y)
            ) * 0.5;
            if (area > max_area) {
                max_area = area;
                max_area_point = data[range_offs];
                next_a = range_offs; // Next a is this b
            }
        }

        sampled[sampled_index++] = max_area_point; // Pick this point from the bucket
        a = next_a; // This a is the next a (chosen b)
    }

    sampled[sampled_index++] = data[data_length - 1]; // Always add last

    return sampled;
}


// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce(func, wait, immediate) {
    var timeout;
    return function () {
        var context = this,
            args = arguments;
        var later = function () {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
};

function panelSize() {

    var navBarH = $(".navbar").height(),
        navBarW = $(".navbar").width(),
        mainHeight = $(".main").height();

    var globalWidth = window.innerWidth,
        globalHeight = window.innerHeight,
        globalMainHeight = globalHeight - navBarH,
        padding = 10

    panelH = (globalMainHeight - (padding * 2) - (padding * 1.5)) / 2;

    console.log("panel size is: " + panelH);

    return panelH;

}


panelH = panelSize();

var panels = $(".panel");
for (i = 0; i < panels.length; i++) {
    panel = panels[i];
    height = setWindow(panel);

}

function setWindow(container) {
    var panel = $(container),
        footer = panel.find(".panel-footer"),
        header = panel.find(".panel-heading"),
        body = panel.find(".panel-body");

    footerH = footer.outerHeight(true);
    headerH = header.outerHeight(true);
    bodyH = body.outerHeight(true);
    panelW = panel.outerWidth(true);

    newH = parseInt(panelH - bodyH - footerH - headerH);
    console.log(newH, panelW);
    body.attr("width", panelW);
    body.attr("height", newH);

}


function update(clus) {

    var medoids = {};

    Object.keys(clusters).forEach(function (key) {
        if (!('medoid' in clusters[key].data)) {
            medoids[clusters[key].children[0].data.medoid] = 0;
        } else {
            medoids[clusters[key].data.medoid] = clusters[key].data.color - 1;
        }
    })

    var v = Object.keys(medoids);

    var margin = {
            top: 0,
            right: 0,
            bottom: 20,
            left: 0
        },

        width = $("#reach-panel").find(".panel-body").attr("width"),
        height = $("#reach-panel").find(".panel-body").attr("height") - 10;

    var colorScale = d3.scaleSequential(globalColor)
        .domain([0, v.length]);

    var t = d3.transition()
        .duration(750);

    // new data join to dom
    var u = d3.select('#reach-plot')
        .selectAll(".chart-scroller")
        .data(v, function (d) {
            return d;
        });

    u.exit().each(function (d) {
        var $sel = $(this);
        $sel.hide("slow", function () {
            $sel.remove();
        });
    })

    // update existing
    u.each(function (d) {
        var chart = d3.select(this);
        chart.select("path")
            .transition(t)
            .attr("fill", colorScale(medoids[d]));
    })

    // add new 
    u.enter()
        .append("div").classed("chart-scroller", "true").property("id", function (d) {
            return "chart_" + d;
        })
        .text(function (d, i) {
            d3.text("data/anuran_mustache/" + d + "RNG_anuran.lr", function (d2) {
                $('#chart_' + d).hide();
                createChart(d2, u, i, d);
                $('#chart_' + d).show("fast");
            });
        });

    reachPaging();


    function createChart(data, cont, i, id) {

        var rows = d3.csvParseRows(data);

        new Chart({
            data: rows[1].map(function (d) {
                return +d;
            }),
            id: id,
            index: i,
            width: width,
            height: height,
            margin: margin,
            rows: rows.length,
            container: cont,
            color: 1
        });

    }


    function Chart(options) {

        this.chartData = options.data;
        this.width = options.width;
        this.height = options.height;
        this.svg = options.svg;
        this.id = options.id;
        this.name = options.name;
        this.margin = options.margin;
        this.showBottomAxis = true;
        this.mpts = [];
        this.rows = options.rows;
        this.container = options.container;
        this.fill = options.color;
        this.index = options.index

        this.fill = v.indexOf(this.id);

        this.rows = 4;

        colW = parseInt(12 / this.rows);

        var chr = this.chartData.map(function (d, i) {
            return [i, d];
        })

        var svgCont = d3.select("#reach-plot").select("#chart_" + this.id)
            .classed("col-xs-" + colW, "true")
            .classed("chart-scroller", "true")
            .classed("nopadding", "true")
            .append("a")
            .classed("no-link", "true")
            .attr("data-toggle", "modal")
            .attr("data-target", "#reach-modal")
            .attr("data-value", this.id)
            .attr("href", "#")

        var chartXScale = (this.width / this.rows) - (this.margin.right + this.margin.left + 40),
            chartYScale = this.height - (this.margin.top + this.margin.bottom);

        var svg = svgCont.append("svg")
            .attr("id", "chart" + this.id)
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", "-40 " + (-(this.margin.top + this.margin.bottom) / 2) + " " + options.width / this.rows + " " + (options.height));

        /* XScale is based on the number of points to be plotted */
        this.xScale = d3.scaleLinear()
            .range([0, chartXScale])
            .domain([0, this.chartData.length - 1]);


        /* YScale is linear based on the maxData Point we found earlier */
        this.yScale = d3.scaleLinear()
            .range([chartYScale, 0])
            .domain([0, d3.max(this.chartData)]);

        var xS = this.xScale;
        var yS = this.yScale;

        this.data = largestTriangleThreeBuckets(chr, Math.floor(chartXScale / 2));
        this.height = chartYScale;
        this.width = chartXScale;

        this.area = d3.area()
            .curve(d3.curveMonotoneX)
            .x(function (d, i) {
                return xS(d[0]);
            })
            .y0(this.height)
            .y1(function (d) {
                return yS(d[1]);
            });

        svg.append("defs").append("clipPath")
            .attr("id", "clip-" + this.id)
            .append("rect")
            .attr("width", this.width)
            .attr("height", this.height);

        this.chartContainer = svg.append("g")
            .attr("transform", "translate(" + this.margin.left + "," + "0" + ")");

        this.chartContainer.append("path")
            .data([this.data])
            .attr("class", "chart")
            .attr("val", this.id)
            .attr("clip-path", "url(#clip-" + this.id + ")")
            .attr("fill", colorScale(medoids[this.id]))
            .attr("d", this.area);

        this.yAxis = d3.axisLeft().scale(this.yScale).ticks(5);

        this.chartContainer.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(-3,0)")
            .call(this.yAxis);

        this.chartContainer.append("text")
            .attr("class", "country-title")
            .attr("transform", "translate(" + (chartXScale - 150) + ",20)")
            .text("mpts: " + v[this.fill]);

        d3.selectAll(".no-link").on("mouseover", function () {
            var text = d3.select(this).select(".country-title");
            text.transition().duration(100).style("font-size", 24);
        }).on("mouseout", function () {
            var text = d3.select(this).select(".country-title");

            text.transition().duration(100).style("font-size", 15);
        })

        d3.selectAll(".no-link").selectAll("svg").on("mouseover", function () {
            var chart = d3.select(this).select("path");
            chart.transition().duration(100).attr("fill", "blue")
        }).on("mouseout", function () {
            var chart = d3.select(this).select("path");
            chart.transition().duration(100).attr("fill", colorScale(medoids[chart.attr("val")]))
        })

    }

}


function dendrogram() {

    var margin = {
        top: 10,
        right: 0,
        bottom: 10,
        left: 0
    };

    var width = $("#dendogram-panel").find(".panel-body").attr("width"),
        height = $("#dendogram-panel").find(".panel-body").attr("height");


    var colorScale = d3.scaleSequential(globalColor);

    var svg = d3.select("#chart-dendrogram").append("svg")
        .attr("preserveAspectRatio", "xMidYMid Slice")
        .attr("viewBox", "-40 -15 " + (width - 60) + " " + (height - 15));

    // Variable to hold the root of the hierarchy.
    var clusterLayout = d3.cluster()
        .size([width - 100, height])
        .separation(function separation(a, b) {
            return a.parent == b.parent ? 2 : 2;
        });

    var changedClusters = false;

    // Maximum values for the Y axis
    var ymax = Number.MIN_VALUE;
    var ymin = Number.MAX_VALUE;

    var color = d3.scaleOrdinal(d3.schemeCategory10);

    var data = d3.json("data/anuran2.json", function (json) {
        var root = d3.hierarchy(json);

        clusterLayout(root);

        var nodes = root.descendants()

        // Finds the maximum and minimum density values.
        nodes.forEach(function (d) {
            if (d.data.y > ymax)
                ymax = d.data.y;
            if (d.data.y < ymin)
                ymin = d.data.y;
        });

        var exp = 1.0;

        yScale = d3.scalePow().domain([ymin, ymax]).range([0, height - 60]).exponent(exp).clamp(true);
        yScaleInverted = d3.scalePow().domain([ymax, ymin]).range([0, height - 60]).exponent(exp).clamp(true);

        var loadLine = d3.select("#slider").property("value")
        if (typeof (loadLine) == 'float') {
            hardcodeline = loadLine
        } else {
            var hardcodeline = (loadLine / 100) * ymax;
        }


        var link = svg.selectAll(".link")
            .data(nodes.slice(1))
            .enter().append("path")
            .attr("class", "link")
            .attr("d", elbow)
            .attr("stroke", "grey")
            .style("opacity", 0.3);

        var node = svg.selectAll(".node")
            .data(nodes)
            .enter().append("g")
            .attr("class", "node")
            .style("opacity", 0.3)
            .attr("transform", function (d) {
                return "translate(" + d.x + "," + yScaleInverted(d.data.y) + ")";
            });

        // Adds the shape of the nodes in the dendrogram.
        node.append("circle")
            .attr("r", 2.5)

        node.append("text")
            .attr("x", 0)
            .attr("y", 20)
            .style("text-anchor", "middle")
            .text(function (d) {
                return d.children ? "" : d.data.label;
            });

        // Define the div for the tooltip
        var div = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        node.on("mouseover", function (d) {
                d3.select(this).attr("stroke", "red")
                div.transition()
                    .duration(200)
                    .style("opacity", 1.0);

                if (d.data.name) {
                    displayText = d.data.name;
                } else {
                    displayText = d.label;
                }

                div.html(displayText)
                    .style("left", (d3.event.pageX + 10) + "px")
                    .style("top", (d3.event.pageY) + "px");
            })
            .on("mouseout", function (d) {
                d3.select(this).attr("stroke", "none");
                div.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        var transitionTime = 100;

        // colour and extract clusters from dendogram based on threshold bar current value. 
        function clusterThresholdExtraction(currentValue) {
            var clusters = {}

            function traverse(d, i) {

                if (d.data.y <= currentValue) {
                    if (d.parent != null && d.parent.data.y > currentValue && d.children != null) {
                        clusters[d.data.name] = d;
                    }
                } else if (currentValue == 0) {
                    clusters[root.data.name] = root;
                }

            };

            node.each(traverse);

            return clusters;

        }

        function shading(clusters) {

            var colouring = {};

            // label nodes with the color colors
            counter = 1;
            Object.keys(clusters).forEach(function (key) {
                childs = clusters[key].descendants();
                for (y = 0; y < childs.length; y++) {
                    colouring[childs[y].data.name] = counter;
                }
                clusters[key].data['color'] = counter;
                counter++;
            });

            // adjust color scale to match number of selection
            colorScale.domain([1, Object.keys(clusters).length + 1]);

            // fill node circles with color
            node
                .attr("fill", function (d, i) {
                    val = colouring[d.data.name];

                    if (val) {
                        return colorScale(val);
                    }
                    return "grey"

                }).style("opacity", function (d, i) {
                    val = colouring[d.data.name];
                    if (val) {
                        return 1;
                    }
                    return 0.3
                });

            // change node link colors
            link
                .attr("stroke", function (d, i) {

                    if (clusters[d.data.name]) {
                        return "grey";
                    }

                    val = colouring[d.data.name];
                    if (val) {
                        return colorScale(val);
                    }
                    return "grey";
                }).style("opacity", function (d, i) {

                    if (clusters[d.data.name]) {
                        return 0.3;
                    }

                    val = colouring[d.data.name];
                    if (val) {
                        return 1;
                    }
                    return 0.3
                });

        }


        var drag = d3.drag()
            .on('drag', function (d) {
                d3.select("body")
                    .style("cursor", "row-resize");
                var dy = d3.event.dy;
                var dy2 = d3.event.y;

                var lineScale = d3.scalePow().domain([height - 60, 0]).range([ymin, ymax]).clamp(true),
                    lineBounds = d3.scalePow().range([0, height - 60]).exponent(exp).clamp(true);

                d3.select(this).attr("y1", dy2).attr("y2", dy2);


                var currentValue = lineScale(dy2);
                d3.select("#slider").property("value", function () {
                    return currentValue;
                });

                clusters = clusterThresholdExtraction(currentValue);
                shading(clusters);
            })
            .on("end", function () {
                d3.select("body")
                    .style("cursor", "auto");
                update(clusters);
            });

        function manualExtract(bool) {
            if (bool) {
                node.on("click", function (d) {
                    if (d.children == null) {
                        return;
                    }

                    if (clusters[d.data.name]) {
                        delete clusters[d.data.name];

                    } else {

                        children = d.descendants();
                        parents = d.ancestors();

                        // removes parents from colouring
                        for (x = 0; x < parents.length; x++) {
                            if (clusters[parents[x].data.name]) {
                                delete clusters[parents[x].data.name];
                            }
                        }

                        // removes children nodes from the selected clusters
                        for (x = 0; x < children.length; x++) {
                            if (clusters[children[x].data.name]) {
                                delete clusters[children[x].data.name];
                            }
                        }

                        // add selection to selected clusters
                        clusters[d.data.name] = d;

                    }

                    shading(clusters);
                    update(clusters);

                });
            } else {
                node.on("click", null);
                //                node.on("mouseover", null);
                //                node.on("mouseout", null);
            }
        }

        var updateDrag = debounce(function (a) {

            clusters = clusterThresholdExtraction(a);
            shading(clusters);

        }, 10);

        var dragger = d3.drag()
            .on("drag", function (d) {

                d3.select("body")
                    .style("cursor", "row-resize");

                var dy = d3.event.dy;
                var dy2 = d3.event.y;

                var lineScale = d3.scalePow().domain([height - 60, 0]).range([ymin, ymax]).clamp(true),
                    lineBounds = d3.scalePow().range([0, height - 60]).exponent(exp).clamp(true);

                d3.select(this).attr("y1", dy2).attr("y2", dy2);

                var currentValue = lineScale(dy2);
                d3.select("#slider").property("value", function () {
                    return currentValue;
                });

                updateDrag(currentValue);


            })
            .on("end", function () {
                d3.select("body")
                    .style("cursor", "auto");
                update(clusters);
            });


        // Threshold Bar
        var thresholdBar = svg.append("g");

        thresholdBar.append("line")
            .attr("x1", 0)
            .attr("y1", yScaleInverted(hardcodeline))
            .attr("x2", width - margin.left - margin.right - 100) // Dynamic size of the bar
            .attr("y2", yScaleInverted(hardcodeline))
            .call(drag);



        d3.select("#slider")
            .property("min", ymin)
            .property("max", ymax)
            .attr("step", (ymax - ymin) / 1000)
            .property("value", hardcodeline)
            .text(function () {
                clusters = clusterThresholdExtraction(this.value);
                shading(clusters)
            });

        // Link the threshold bar to the slider.
        d3.select("#slider").on("input", function () {
            var currentValue = this.value;
            thresholdBar.select("line").attr("y1", y1 => yScaleInverted(currentValue))
            thresholdBar.select("line").attr("y2", y2 => yScaleInverted(currentValue))
            clusters = clusterThresholdExtraction(currentValue);
            shading(clusters);

        });


        var yAxis = d3.axisLeft().scale(this.yScaleInverted).ticks(5);

        svg.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(0,0)")
            .call(yAxis);

        // dendogram node selection method switcher
        var a1, b1;

        function dendoSelect(a) {

            if (a.checked) {

                a1 = Object.keys(clusters);

                option = a.value;

                if (option == 'bar') {

                    thresholdBar.classed("hidden", false);
                    manualExtract(false);

                    if (b1 == undefined) {
                        b1 = a1;
                    }

                    var isEqual = (JSON.stringify(a1.sort()) === JSON.stringify(b1.sort()));

                    if (!isEqual) {

                        d3.select("#slider").text(function () {
                            clusters = clusterThresholdExtraction(this.value);
                            shading(clusters);
                            update(clusters);
                        });

                    }

                } else if (option == 'manual') {

                    thresholdBar.classed("hidden", true);
                    manualExtract(true);
                    shading(clusters);

                }

                b1 = Object.keys(clusters);

            }

        }

        // set dendogram initially 
        d3.selectAll("input").each(function (d, i) {
            dendoSelect(this)
        })

        // set dendogram when radio buttons changed
        d3.selectAll("input[name='radio']").on("change", function () {
            dendoSelect(this)
        })

        update(clusters);


    });

    // Transform this into a path
    function elbow(d, i) {
        return "M" + d.parent.x + "," + yScaleInverted(d.parent.data.y) +
            "H" + d.x + "V" + yScaleInverted(d.data.y);
    }

}


function haiPlot() {

    var width = parseInt((screen.width - (30 + 35)) / 4);
    var width = parseInt($("#hai-panel").find(".panel-body").attr("width"));
    var height = parseInt($("#hai-panel").find(".panel-body").attr("height"));

    console.log(width, height);

    if (width > height) {
        width = height;
    } else if (height > width) {
        height = width;
    }

    console.log(width, height);

    var gridSize = (width - (30 * 2)) / 47,
        gridSizeY = (height - (30 * 2)) / 47,
        haiRange = 0,
        padding = height * 0.05,
        datasets = ["data/matrix_sim.csv", "data/data.tsv"];

    var heatmapChart = function (tsvFile) {
        d3.tsv(tsvFile,
            function (d) {
                return {
                    day: +d.day,
                    hour: +d.hour,
                    value: +d.value
                };
            },
            function (error, data) {

                var minValue = d3.min(data, function (d) {
                    return +d.value;
                });

                var maxValue = d3.max(data, function (d) {
                    return +d.value;
                });

                var haiRange = d3.max(data, function (d) {
                    return +d.hour;
                });

                labels = [];
                for (var i = 0; i < (haiRange + 1); i++) {
                    labels.push(i);
                }

                var colorScale = d3.scaleSequential(d3.interpolateBuPu)
                    .domain([maxValue, minValue]);

                //                // ------------------------------------------------------------------------------
                //
                //                // Scale for workingtime
                //                var countScale = d3.scaleLinear()
                //                    .domain([minValue, maxValue])
                //                    .range([0, width]);
                //
                //                // Calculate variables for the temp gradient
                //                var numStops = 10;
                //                var countRange = countScale.domain();
                //                // index 2 is the substraction between max and min
                //                countRange[2] = countRange[1] - countRange[0];
                //                var countPoint = [];
                //
                //                for (var i = 0; i < numStops; i++) {
                //                    countPoint.push(i * countRange[2] / (numStops - 1) + countRange[0]);
                //                }
                //            
                //                var legend = d3.select("#hai-legend").append("svg")
                //                    .attr("preserveAspectRatio", "xMinYMin Slice")
                //                    .attr("viewBox", height + " 0 " + width + " " + 10);
                //            
                //                // Create the gradient
                //                legend.append("defs")
                //                    .append("linearGradient")
                //                    .attr("id", "legend-traffic")
                //                    .attr("x1", "0%").attr("y1", "0%")
                //                    .attr("x2", "100%").attr("y2", "0%")
                //                    .selectAll("stop")
                //                    .data(d3.range(numStops))
                //                    .enter().append("stop")
                //                    .attr("offset", function (d, i) {
                //                        return countScale(countPoint[i]) / width;
                //                    })
                //                    .attr("stop-color", function (d, i) {
                //                        return colorScale(countPoint[i]);
                //                    });
                //
                //                var legendWidth = Math.min(width * 0.8, 400);
                //            
                //                var legendsvg = legend.append("g")
                //                    .attr("class", "legendWrapper")
                //
                //                // Append title
                //                legendsvg.append("text")
                //                    .attr("class", "legendTitle")
                //                    .attr("x", 0)
                //                    .attr("y", 30)
                //                    .style("text-anchor", "middle");
                //                // .text("Number of times I started to work");
                //
                //                // Draw the Rectangle
                //                legendsvg.append("rect")
                //                    .attr("class", "legendRect")
                //                    .attr("x", -legendWidth / 2)
                //                    .attr("y", 50)
                //                    .attr("width", legendWidth)
                //                    .attr("height", 10)
                //                    .style("fill", "url(#legend-traffic)");
                //
                //                // Set scale for x-axis
                //                var xScale = d3.scaleLinear()
                //                    .range([-legendWidth / 2, legendWidth / 2])
                //                    .domain([minValue, maxValue]);
                //
                //                // Define x-axis
                //                var xAxis = d3.axisBottom()
                //                    .ticks(5)
                //                    .scale(xScale);
                //
                //                // Set up X axis
                //                legendsvg.append("g")
                //                    .attr("class", "axis")
                //                    .attr("transform", "translate(0," + 55 + ")")
                //                    .call(xAxis);
                //            
                //            // ------------------------------------------------------------------------------
                //            
                //                

                var svg = d3.select("#hai-plot").append("svg")
                    .attr("preserveAspectRatio", "xMidYMid meet")
                    .attr("viewBox", "-35 -30 " + width + " " + height)
                    .attr("width", width)
                    .attr("height", height)
                    .style("display", "block")
                    .style("margin", "auto");

                var HeatMapxScale = d3.scaleLinear()
                    .range([gridSize / 2, (haiRange + 0.5) * gridSize])
                    .domain([d3.min(labels), d3.max(labels)]);

                var HeatMapxScaleY = d3.scaleLinear()
                    .range([gridSizeY / 2, (haiRange + 0.5) * gridSizeY])
                    .domain([d3.min(labels), d3.max(labels)]);

                // Define x-axis
                var HeatMapxAxisLeft = d3.axisLeft()
                    .ticks(10)
                    .scale(HeatMapxScaleY);

                var HeatMapxAxisTop = d3.axisTop()
                    .ticks(10)
                    .scale(HeatMapxScale);

                // Set up X axis Left
                svg.append("g")
                    .attr("class", "axis-heatmap")
                    .attr("transform", "translate(" + -10 + "," + -gridSize + ")")
                    .call(HeatMapxAxisLeft);

                // Set up X axis Top
                svg.append("g")
                    .attr("class", "axis-heatmap")
                    .attr("transform", "translate(" + -gridSize + "," + -10 + ")")
                    .call(HeatMapxAxisTop);

                // Define the div for the tooltip
                var div = d3.select("body").append("div")
                    .attr("class", "tooltip")
                    .style("opacity", 0);

                var cards = svg.selectAll(".hour")
                    .data(data, function (d) {
                        return d.day + ':' + d.hour;
                    });

                cards.append("title");

                cards.enter().append("rect")
                    .attr("x", function (d, i) {
                        return (d.hour - 1) * (gridSize);
                    })
                    .attr("y", function (d, i) {
                        return (d.day - 1) * gridSizeY;
                    })
                    .attr("width", gridSize)
                    .attr("height", gridSizeY)
                    .style("fill", function (d, i) {
                        return colorScale(d.value);
                    })
                    .on("mouseover", function (d) {
                        d3.select(this).style("fill", "#ffffff");
                        div.transition()
                            .duration(200)
                            .style("opacity", 1.0);
                        div.html(d.hour + " " + d.day + "  <br> " + d.value)
                            .style("left", (d3.event.pageX + 10) + "px")
                            .style("top", (d3.event.pageY) + "px");
                    })
                    .on("mouseout", function (d) {
                        d3.select(this).style("fill", function (d, i) {
                            return colorScale(d.value);
                        });
                        div.transition()
                            .duration(500)
                            .style("opacity", 0);
                    });

                cards.transition().duration(50)
                    .style("fill", function (d, i) {
                        return colorScale(d.value);
                    });

                cards.select("title").text(function (d) {
                    return d.value;
                });

                cards.exit().remove();


            });

    };

    heatmapChart(datasets[0]);

}


dendrogram();
haiPlot("#hai-plot");
//MultiReachabilityPlots();

$('#loading').delay(1000).fadeOut(1000);



$("#reach-modal").on("show.bs.modal", function (event) {
    var button = $(event.relatedTarget)
    var value = button.data('value')

    var modal = $(this);
    modal.find('.modal-title').text('Chart ' + value);

    var modalPad = parseInt($(window).innerHeight() * 0.10),
        width = parseInt($(window).innerWidth() - modalPad),
        h = parseInt($(window).innerHeight() - modalPad);

    $(".modal-xl").css("height", h);
    $(".modal-xl").css("width", width);

    drawReach(+value);

});

$('#reach-modal').on('hidden.bs.modal', function () {
    d3.select("#full-reach").select("svg").remove();
})


function reachPaging() {

    count = Math.ceil(Object.keys(clusters).length / 4);
    pages = [];
    for (i = 0; i < count; i++) {
        pages.push(i);
    }

    pgLinks = d3.select(".paging").selectAll(".pg").data(pages, function (d) {
        return +d;
    })

    pgLinks.exit().remove();

    pgLinks.enter().append("text").classed("pg", true).append("a").attr("href", "#").html(function (d) {
        return (d + 1);
    })

    move = $("#reach-plot").width();

    d3.selectAll(".pg").on("click", function (d) {
        offset = move * +d;
        $("#reach-plot").scrollLeft(offset);

    });



}
