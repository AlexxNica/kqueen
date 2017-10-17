Math.radians = function(degrees) {
  return degrees * Math.PI / 180;
};

// Converts from radians to degrees.
Math.degrees = function(radians) {
  return radians * 180 / Math.PI;
};

var K8sHiveChart = {
  init: function(container, config, data) {
    if(!data){
      throw new Error("Cannot init K8SHiveChart data is invalid!")
    }
    config = config || {};

    var width = config.width || 960
     ,  height = config.height || 600
     ,  outerRadius = config.outerRadius || 300
     ,  innerRadius = config.innerRadius || 40
     ,  axes = [
          {x: 0, angle: 30, radius: 240, name: "Pods", kind: "Pod"},
          {x: 1, angle: 270, radius: 160, name: "Nodes", kind: "Node"},
          {x: 2, angle: 150, radius: 160, name: "Services", kind: "Service"},
          {x: 3, angle: 210, radius: 120, name: "Miscellaneous", kind: "Other"}
        ]
     ,  icon_mapping = {
          Pod: "\uf1fb", // engine
          Node: "\uf48b", // server
          Service: "\uf59f", // web
          Other: "\uf59f" // other services
        }
     ,  color_mapping = {
          Pod: "red",
          Node: "green",
          Service: "orange",
          Other: "black"
    };

    self.itemCounters = {
      Service: 0,
      Pod: 0,
      Node: 0,
      Other: 0
    };

    self.axisMapping = {
      Pod: 0,
      Node: 1,
      Service: 2,
      Other: 3
    };

    var radius_mapping = {
      Pod: d3.scaleLinear().range([innerRadius, 240]),
      Node: d3.scaleLinear().range([innerRadius, 160]),
      Service: d3.scaleLinear().range([innerRadius, 160]),
      Other: d3.scaleLinear().range([innerRadius, 120])
    };

    if(typeof data.items === 'object'){
      data.items = Object.values(data.items);
    }

    var nodes = this.createNodes(data.items);

    self.itemStep = {
      Service: 1 / self.itemCounters.Service,
      Pod: 1 / self.itemCounters.Pod,
      Node: 1 / self.itemCounters.Node,
      Other: 1 / self.itemCounters.Other
    };

    var links = this.createLinks(nodes, data.relations);

    var angle = function(d) {
      var angle = 0
       ,  found = false;
      axes.forEach(function(item) {
        if (d.kind == item.kind) {
          angle = item.angle;
          found=true;
        }
      });
      if(!found){
        console.log("Cannot compute angle for item " + d)
      }
      return angle
    }
    var radius = d3.scaleLinear().range([innerRadius, outerRadius]);
    var icon = function(i) { return icon_mapping[i] };
    var color = function(i) { return color_mapping[i] };

    var NodeMouseFunctions = {
      linkOver: function(d){
        svg.selectAll(".link").classed("active", function(p) { return p === d; });
        svg.selectAll(".node circle").classed("active", function(p) { return p === d.source || p === d.target; });
        svg.selectAll(".node text").classed("active", function(p) { return p === d.source || p === d.target; });
        //NodeMouseFunctions.over();
      },
      nodeOver: function(d) {
        svg.selectAll(".link").classed("active", function(p) { return p.source === d || p.target === d; });
        d3.select(this).select("circle").classed("active", true);
        d3.select(this).select("text").classed("active", true);
        tooltip.html("Node - " + d.name + "<br/>" + "Kind - " + d.kind)
          .style("left", (d3.event.pageX + 5) + "px")
          .style("top", (d3.event.pageY - 28) + "px");
        tooltip.transition()
          .duration(200)
          .style("opacity", .9);
      },
      out: function(d){
        svg.selectAll(".active").classed("active", false);
        tooltip.transition()
          .duration(500)
          .style("opacity", 0);
      }
    };

    var svg = d3.select(container)
      .append("svg")
        .attr("width", width)
        .attr("height", height)
      .append("g")
        .attr("transform", "translate(" + width/2 + "," + height/2 + ")");

    var tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

    // Hive plot render

    axe = svg.selectAll(".node").data(axes)
      .enter().append("g");

    axe.append("line")
      .attr("class", "axis")
      .attr("transform", function(d) { return "rotate(" + d.angle + ")"; })
      .attr("x1", function(d) { return radius_mapping[d.kind].range()[0] })
      .attr("x2", function(d) { return radius_mapping[d.kind].range()[1] });

    axe.append("text")
      .attr("class", "axis-label")
      .attr('font-size', '16px' )
      .attr('font-family', 'verdana' )
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'central')
      .text(function(d) { return d.name; })
      .attr("transform", function(d) {
        x = (radius_mapping[d.kind].range()[1] + 30) * Math.cos(Math.radians(d.angle));
        y = (radius_mapping[d.kind].range()[1] + 30) * Math.sin(Math.radians(d.angle));
        return "translate(" + x + ", " + y + ")";
      });

    svg.selectAll(".link").data(links)
      .enter().append("path")
        .attr("class", "link")
        .attr("d", d3.hive.link()
        .angle(function(d) { return Math.radians(angle(d)); })
        .radius(function(d) { return radius_mapping[d.kind](d.y*itemStep[d.kind] - 0.1); }))
        //.style("stroke", function(d) { return color(d.source.kind); })
        .on("mouseover", NodeMouseFunctions.linkOver)
        .on("mouseout", NodeMouseFunctions.out);

    node = svg.selectAll(".node").data(nodes)
      .enter().append("g")
        .attr("class", "node")
        .attr("transform", function(d) {
          x = radius_mapping[d.kind](d.y*itemStep[d.kind] - 0.1) * Math.cos(Math.radians(angle(d)));
          y = radius_mapping[d.kind](d.y*itemStep[d.kind] - 0.1) * Math.sin(Math.radians(angle(d)));
          return "translate(" + x + ", " + y + ")";
        })
        .on("mouseover", NodeMouseFunctions.nodeOver)
        .on("mouseout", NodeMouseFunctions.out);

    node.append("circle")
      .attr("r", 12)
      .style("stroke", function(d) { return color(d.kind); })

    node.append("text")
      .attr('font-family', 'Material Design Icons')
      .attr("color", function(d) { return color(d.kind); })
      .attr('font-size', function(d) { return '14px'; } )
      .text(function(d) { return icon(d.kind); })
      .attr("transform", "translate(-7, 5)")
  },

  createNodes: function(items){
    return items.map(function(item){
        item["id"] = item.metadata.uid;
        item["name"] = item.metadata.name || "Unnamed node";
        if(["Pod","Service","Node"].indexOf(item.kind) < 0){
          item.kind = "Other";
        }
        item["x"] = self.axisMapping[item.kind];
        self.itemCounters[item.kind]++;
        item["y"] = self.itemCounters[item.kind];
        return item;
    });
  },

  createLinks: function(nodes, relations){
    return relations.map(function(link){
      var retLink = {};
      nodes.forEach(function(node){
        if(link.source == node.id){
          retLink.source = node;
        } else if(link.target == node.id){
          retLink.target = node;
        }
      });
      if(!retLink.hasOwnProperty("source") || !retLink.hasOwnProperty("target")){
        console.log("Cannot found relation node for link " + link);
        retLink = link;
      }
      return retLink;
    });
  }
};