var nomnoml = nomnoml || {}

nomnoml.Classifier = function (type, name, compartments){
	if (type === 'ENUM'){
		var enumLabel = _.cloneDeep(compartments[0]),
		label = '<<enumeration>>'
		enumLabel.lines[0] = label
		compartments.unshift(enumLabel)
	}
	return {
        type: type,
        name: name,
        compartments: compartments
    }
}
nomnoml.Compartment = function (lines, nodes, relations){
	return {
        lines: lines,
        nodes: nodes,
        relations: relations
    }
}

nomnoml.layout = function (measurer, config, ast){
	function runDagre(input){
		return dagre.layout()
					.rankSep(config.spacing)
					.nodeSep(config.spacing)
					.edgeSep(config.spacing)
					.rankDir(config.direction)
					.run(input)
	}
	function measureLines(lines, fontWeight){
		if (!lines.length)
			return { width: 0, height: config.padding }
		measurer.setFont(config, fontWeight)
		return {
			width: Math.round(_.max(_.map(lines, measurer.textWidth)) + 2*config.padding),
			height: Math.round(measurer.textHeight() * lines.length + 2*config.padding)
		}
	}
	function layoutCompartment(c, compartmentIndex){
		var textSize = measureLines(c.lines, compartmentIndex ? 'normal' : 'bold')
		c.width = textSize.width
		c.height = textSize.height

		if (!c.nodes.length && !c.relations.length)
			return

		_.each(c.nodes, layoutClassifier)

		var g = new dagre.Digraph()
		_.each(c.nodes, function (e){
			g.addNode(e.name, { width: e.width, height: e.height })
		})
		_.each(c.relations, function (r){
			g.addEdge(r.id, r.start, r.end)
		})
		var dLayout = runDagre(g)

		var rels = _.keyBy(c.relations, 'id')
		var nodes = _.keyBy(c.nodes, 'name')
		function toPoint(o){ return {x:o.x, y:o.y} }
		dLayout.eachNode(function(u, value) {
			nodes[u].x = value.x
			nodes[u].y = value.y
		})
		dLayout.eachEdge(function(e, u, v, value) {
			var start = nodes[u], end = nodes[v]
			rels[e].path = _.map(_.flatten([start, value.points, end]), toPoint)
		})
		var graph = dLayout.graph()
		var graphHeight = graph.height ? graph.height + 2*config.gutter : 0
		var graphWidth = graph.width ? graph.width + 2*config.gutter : 0

		c.width = Math.max(textSize.width, graphWidth) + 2*config.padding
		c.height = textSize.height + graphHeight + config.padding
	}
	function layoutClassifier(clas){
		_.each(clas.compartments, layoutCompartment)
		clas.width = _.max(_.map(clas.compartments, 'width'))
		clas.height = skanaar.sum(clas.compartments, 'height')
		if (clas.type === 'HIDDEN'){
			clas.width = 0
			clas.height = 0
		}
		clas.x = clas.width/2
		clas.y = clas.height/2
		_.each(clas.compartments, function(co){ co.width = clas.width })
	}
	layoutCompartment(ast)
	return ast
}
