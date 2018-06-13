var margin = {top: 30, right: 110, bottom: 70, left: 40},
    width = 800 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

var svg = d3.select("#svggeneral")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
var svgPlatf = d3.select("#svgplatforms")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
var parseTime = d3.timeParse("%d-%b-%y"),
    bisectDate = d3.bisector(function(d) { return d.date; }).left,
    formatValue,
    formatCurrency = function(d) { 
        if (d == 100) {
            formatValue = d3.format("d");
        }
        else if (d == 0) {
            formatValue = d3.format("d");
        }
        else {
            formatValue = d3.format(",.3f");
        }
        return formatValue(d) + "%"; 
    };

var x = d3.scaleTime()
    .rangeRound([0, width]);

var y = d3.scaleLinear()
    .rangeRound([height, 0]);

var linegeneral = d3.line()
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y(d.general); });
var lineios = d3.line()
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y(d.ios); });
var lineandroid = d3.line()
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y(d.android); });
var linecanvas = d3.line()
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y(d.canvas); });
var linekindle = d3.line()
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y(d.kindle); });

d3.json("data.json", function(error, data) {
    if (error) throw error;
    data.forEach(function(d) {
        d.datestr = d.date;
        d.date = parseTime(d.date); 
        d.general = +d.general;
        d.ios = +d.ios;
        d.android = +d.android;
        d.canvas = +d.canvas;
        d.kindle = +d.kindle;
    });
    data.columns = ["date", "general", "ios", "android", "canvas", "kindle"];
    x.domain(d3.extent(data, function(d) { return d.date; }));
    if (x.domain()[0].getTime() == x.domain()[1].getTime()) {
        var dateLess = d3.timeDay.offset(x.domain()[0], -1);
        var dateMore = d3.timeDay.offset(x.domain()[0], 1);
        x.domain([dateLess, dateMore])
    }
    var min=[];
    var max=[];
    for (let l = 1; l < data.columns.length; l++) {
        min.push(Math.min.apply(Math,data.map(function(o){return o[data.columns[l]]})));
        max.push(Math.max.apply(Math,data.map(function(o){return o[data.columns[l]]})));        
    }
    
    y.domain([Math.min.apply(Math,min.map(function(o){return o})) - 3, Math.max.apply(Math,max.map(function(o){return o}))]);
    //y.domain([d3.min(data, function(d) { return d.general - 3; }), d3.max(data, function(d) { return d.general; })]);
    svg.append("text")
        .attr("x", ((width + margin.left + margin.right) / 2))             
        .attr("y", -15)
        .attr("text-anchor", "middle")  
        .style("font-size", "large") 
        .style("font-weight", "bold")  
        .text("General Full functionality");
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x))
    svg.append("g")
        .call(d3.axisLeft(y).tickArguments([5]))
        .append("text")
        .attr("fill", "#000")
        .attr("transform", "rotate(0)")
        .attr("y", -15)
        .attr("x", margin.left)
        .attr("text-anchor", "end")
        .text("Avail. (%)");
    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "blue")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("stroke-width", 5.5)
        .attr("d", linegeneral);
    svgPlatf.append("text")
        .attr("x", ((width + margin.left + margin.right) / 2))             
        .attr("y", -15)
        .attr("text-anchor", "middle")  
        .style("font-size", "large") 
        .style("font-weight", "bold")  
        .text("Full functionality per platforms");
    svgPlatf.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x))
    svgPlatf.append("g")
        .call(d3.axisLeft(y).tickArguments([5]))
        .append("text")
        .attr("fill", "#000")
        .attr("transform", "rotate(0)")
        .attr("y", -15)
        .attr("x", margin.left)
        .attr("text-anchor", "end")
        .text("Avail. (%)");
    svgPlatf.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("stroke-width", 7.5)
        .attr("d", lineios);
    svgPlatf.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "green")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("stroke-dasharray", 5)
        .attr("stroke-width", 4.5)
        .attr("d", lineandroid);
    svgPlatf.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("stroke-dasharray", 2.5)
        .attr("stroke-width", 3.5)
        .attr("d", linecanvas);
    svgPlatf.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "orange")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("stroke-dasharray", 5.5)
        .attr("stroke-width", 2.5)
        .attr("d", linekindle);
//mouse move
    var focus = svg.append("g")
        .style("display", "none");
    focus.append("circle")
        .attr("r", 4.5)
        .attr("fill", "none")
        .attr("stroke", "steelblue");
    focus.append("text")
        .attr("x", 9)
        .attr("dy", ".95em");
    svg.append("rect")
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .attr("width", width)
        .attr("height", height)
        .on("mouseover", function() { focus.style("display", null); })
        .on("mouseout", function() { focus.style("display", "none"); })
        .on("mousemove", mousemove);
    function mousemove() {
        var x0 = x.invert(d3.mouse(this)[0]),
            i = bisectDate(data, x0, 1),
            d0 = data[i - 1],
            d1 = data[i],
            d = x0 - d0.date > d1.date - x0 ? d1 : d0;
        focus.attr("transform", "translate(" + x(d.date) + "," + y(d.general) + ")");
        focus.select("text")
        .attr("x", 0)
        .attr("y", 5)
        .text(d.datestr)
        .attr("fill", "black")
        .append('tspan')
        .text(formatCurrency(d.general))
        .attr("fill", "blue")
        .attr("x", 0)
        .attr("y", 35);
    }
    var focusplatf = svgPlatf.append("g")
    .style("display", "none");
    focusplatf.append("circle")
        .attr("r", 4.5)
        .attr("fill", "none")
        .attr("stroke", "black");
    focusplatf.append("text")
        .attr("x", 9)
        .attr("dy", ".95em");
    svgPlatf.append("rect")
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .attr("width", width)
        .attr("height", height)
        .on("mouseover", function() { focusplatf.style("display", null); })
        .on("mouseout", function() { focusplatf.style("display", "none"); })
        .on("mousemove", mousemoveplatf);
    function mousemoveplatf() {
        var x0 = x.invert(d3.mouse(this)[0]),
            i = bisectDate(data, x0, 1),
            d0 = data[i - 1],
            d1 = data[i],
            d = x0 - d0.date > d1.date - x0 ? d1 : d0;
        focusplatf.attr("transform", "translate(" + x(d.date) + "," + y(d.ios) + ")");
        focusplatf.select("text")
            .attr("x", 0)
            .attr("y", 5)
            .text(d.datestr)
            .attr("fill", "black")
            .append('tspan')
            .text("iOS: " + formatCurrency(d.ios))
            .attr("fill", "red")
            .attr("x", 0)
            .attr("y", 35)
            .append('tspan')
            .text("Android: " + formatCurrency(d.android))
            .attr("fill", "green")
            .attr("x", 0)
            .attr("y", 50)
            .append('tspan')
            .text("FB: " + formatCurrency(d.canvas))
            .attr("fill", "steelblue")
            .attr("x", 0)
            .attr("y", 66)
            .append('tspan')
            .text("Kindle: " + formatCurrency(d.kindle))
            .attr("fill", "orange")
            .attr("x", 0)
            .attr("y", 82);
    }
});