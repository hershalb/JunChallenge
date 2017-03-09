(function () {
    function DataFetcher(urlFactory, delay) {
        var self = this;

        self.repeat = false;
        self.delay = delay;
        self.timer = null;
        self.requestObj = null;
        // self.nodes = [];
        // self.edges = [];

        function getNext() {
            self.requestObj = $.ajax({
                    url: urlFactory()
                }).done(function(response) {
                    $(self).trigger("stateFetchingSuccess", {
                        result: response
                    });
                }).fail(function(jqXHR, textStatus, errorThrown) {
                    $(self).trigger("stateFetchingFailure", {
                        error: textStatus
                    });
                }).always(function() {
                    if (self.repeat && _.isNumber(self.delay)) {
                        self.timer = setTimeout(getNext, self.delay);
                    }
                });
        }

        self.start = function(shouldRepeat) {
            self.repeat = shouldRepeat;
            getNext();
        };

        self.stop = function() {
            self.repeat = false;
            clearTimeout(self.timer);
        };

        self.repeatOnce = function() {
            getNext();
        };

        self.setDelay = function(newDelay) {
            this.delay = newDelay;
        };
    }

    var nodes = [];
    var edges = [];
    var dataset = {nodes: [], edges: []};
    var w = 2000;
    var h = 1000;
    var linkDistance=700;
    var colors = [];
    var typeColors = d3.scale.category10();

    var svg = d3.select("body").append("svg").attr({"width":w,"height":h});
    var div = d3.select("body").append("div");

    function addNewEntry($container, contentHTML) {
        if (contentHTML["srcObj"] && contentHTML["destObj"]) {
            var edge = [parseInt(contentHTML["srcObj"].slice(3)) - 1, parseInt(contentHTML["destObj"].slice(3)) - 1];
        }
        if (nodes.indexOf(edge[0] + 1) === -1) {
            nodes.push(edge[0] + 1);
            
        }
        if (nodes.indexOf(edge[1] + 1) === -1) {
            nodes.push(edge[1] + 1);
            // dataset.nodes.push({name: edge[1]});
        }
        if (edges.indexOf(edge) === -1) {
            edges.push(edge);
            var col;
            if (contentHTML["destType"]) {
                col = typeColors(parseInt(contentHTML["destType"].slice(4)));
            } else {
                col = "#ccc"
            }
            // console.log(col);
            dataset.edges.push({source: edge[0], 
                                target: edge[1], 
                                pack: parseInt(contentHTML["packets"]), 
                                traff: parseInt(contentHTML["traffic"]), 
                                typeCol: col,
                                desT: contentHTML["destType"]});
        }

        // var $innerSpan = $("<p/>").text(contentHTML),
        //     $newEntry = $("<li/>").append($innerSpan);

        // $container.append($newEntry);
    }

    function sortNumber(a,b) {
        return a - b;
    }

    function addToNodes() {
        nodes = nodes.sort(sortNumber);
        nodes.forEach(function(num) {
            dataset.nodes.push({name: "obj" + num});
        });

        for(var i = 0; i < nodes.length; i++) {
            colors.push(getRandomColor());
        }
    }

    function getRandomColor() {
        var letters = '0123456789ABCDEF';
        var color = '#';
        for (var i = 0; i < 6; i++ ) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    function drawGraph(connections) {
        var force = d3.layout.force()
            .nodes(dataset.nodes)
            .links(dataset.edges)
            .size([w,h])
            .linkDistance([linkDistance])
            .charge([-500])
            .theta(0.1)
            .gravity(0.05)
            .start();

        var edges = svg.selectAll("line")
          .data(dataset.edges)
          .enter()
          .append("line")
          .attr("id",function(d,i) {return 'edge'+i})
          .attr('marker-end','url(#arrowhead)')
          .attr("x1", function(d, i) {return (d.pack / 100)*5})
          .style("stroke",function(d, i) {return d.typeCol})
          .style("stroke-width", function(d, i) {return (d.traff / 1000)})
          .on("mouseover", function(d, i) {
            var text = d.source.name + " going to " + d.target.name + ", type " + d.desT + ", traffic " + d.traff + ", packets " + d.pack;
            var $innerSpan = $("<h1/>").text(text);
            $innerSpan.css("color", d.typeCol);
            $trafficStatusList.html($innerSpan);
          });

        var nodes = svg.selectAll("circle")
          .data(dataset.nodes)
          .enter()
          .append("circle")
          .attr({"r":30})
          .style("fill",function(d,i){return colors[i];})
          .call(force.drag)


        var nodelabels = svg.selectAll(".nodelabel") 
           .data(dataset.nodes)
           .enter()
           .append("text")
           .attr({"x":function(d){return d.x;},
                  "y":function(d){return d.y;},
                  "class":"nodelabel",
                  "stroke":"black"})
           .text(function(d){return d.name;});

        var edgepaths = svg.selectAll(".edgepath")
            .data(dataset.edges)
            .enter()
            .append('path')
            .attr({'d': function(d) {return 'M '+d.source.x+' '+d.source.y+' L '+ d.target.x +' '+d.target.y},
                   'class':'edgepath',
                   'fill-opacity':0,
                   'stroke-opacity':0,
                   'fill':'blue',
                   'stroke':'red',
                   'id':function(d,i) {return 'edgepath'+i}})
            .style("pointer-events", "none");

        var edgelabels = svg.selectAll(".edgelabel")
            .data(dataset.edges)
            .enter()
            .append('text')
            .style("pointer-events", "none")
            .attr({'class':'edgelabel',
                   'id':function(d,i){return 'edgelabel'+i},
                   'dx':80,
                   'dy':0,
                   'font-size':20,
                   'fill':'black'});

        edgelabels.append('textPath')
            .attr('xlink:href',function(d,i) {return '#edgepath'+i})
            .style("pointer-events", "none")


    force.on("tick", function(){

        edges.attr({"x1": function(d){return d.source.x;},
                    "y1": function(d){return d.source.y;},
                    "x2": function(d){return d.target.x;},
                    "y2": function(d){return d.target.y;}
        });

        nodes.attr({"cx":function(d){return d.x;},
                    "cy":function(d){return d.y;}
        });

        nodelabels.attr("x", function(d) { return d.x; }) 
                  .attr("y", function(d) { return d.y; });

        edgepaths.attr('d', function(d) { var path='M '+d.source.x+' '+d.source.y+' L '+ d.target.x +' '+d.target.y;
                                           //console.log(d)
                                           return path});       

        edgelabels.attr('transform',function(d,i){
            if (d.target.x<d.source.x){
                bbox = this.getBBox();
                rx = bbox.x+bbox.width/2;
                ry = bbox.y+bbox.height/2;
                return 'rotate(180 '+rx+' '+ry+')';
                }
            else {
                return 'rotate(0)';
                }
        });
    });
    
    }

    var $trafficStatusList = $("div"),
        df2 = new DataFetcher(function() {
            return "/traffic_status";
        });


    $(df2).on({
        "stateFetchingSuccess": function(event, data) {
            data.result.data.forEach(function(dataEntry) {
                addNewEntry($trafficStatusList, dataEntry);
            });
            addToNodes();
            drawGraph(edges);
            // console.log(dataset);
            // console.log(nodes);
        },
        "stateFetchingFailure": function(event, data) {
            addNewEntry($trafficStatusList, JSON.stringify(data.error));
            addNewEntry($trafficStatusList, "Hit a snag. Retry after 1 sec...");
            setTimeout(function() {
                $trafficStatusList.html("");
                df2.repeatOnce();
            }, 1000);
        }
    });

    df2.start();
})();