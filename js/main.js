$().ready(function() {
	vista = new VistaPrincipal({el:"#mainchart"});
});

// VistaPrincipal
// ===================
// Vista principal con datos de ...
//
var VistaPrincipal = Backbone.View.extend({
	el:"body",

	events : {
		"change select.attrx" : "selectOption",
		"change select.area" : "selectArea"

	},
	
	initialize: function() {
		_.bindAll(this,"render")
		self= this; // Alias a this para ser utilizado en callback functions

		this.margin = {top: 20, right: 20, bottom: 30, left: 40},
    	this.width = 800 - this.margin.left - this.margin.right,
    	this.height = 500 - this.margin.top - this.margin.bottom;

		// Vista con tooltip para mostrar ficha de establecimiento
		this.tooltip = new VistaToolTipEstablecimiento();

		this.tooltip.message = this.tooltipMessage;

		this.attrx = "desercionagno1";
		this.attry = "arancel";
		this.attrsize = "desercionagno1";
 		this.attrcolor = "institucion";
 		this.area = "Administración y Comercio"
 
    	// Carga de datos
    	//
		this.$el.append("<progress id='progressbar'></progress>");
		d3.tsv("data/empleabilidad.txt", function(data) {
			$("#progressbar").hide(); // Ocultar barra de progreso

			self.data = data;
			self.render();
		});
	},

	tooltipMessage : function(data) {
		formatMiles = d3.format(",d");
		formatDecimal = d3.format('.2f')

		msg = data.carrera + " - " + data.institucion + "<br>";
		msg += "Duración: " + data.duracion +" años<br>";
		msg += "Deserción Año 1: " + data.desercionagno1 +"%<br>";
		msg += "Arancel: $" + formatDecimal(data.arancel)+" millones<br>";
		return msg;
	}, 

	selectOption : function(e) {
		option = $(e.target).val();

		this.attrx= option;
		this.updateNodes();
	},

	selectArea : function(e) {
		option = $(e.target).val();

		this.area= option;
		this.updateNodes();
	},

	cleanStringInt: function(n) {

		//return n.replace("$", "").replace(" ", "").replace(".", "").replace(",", "").replace(/\.|%/g,'');
		return n;
	},

	updateNodes: function() {
		var self = this;

		var color = d3.scale.category10();

		this.filtereData = _.filter(this.data, function(d) {
			return (parseFloat(d[self.attry])>0) && (parseFloat(d[self.attrx])>0) && (d.area == self.area);
		});

		// Calcula el dominio de las escalas en base al valos de los datos que van en ejes 
		// x (psu Lenguaje) e y (financiamiento)
		this.xScale.domain(d3.extent(this.data, function(d) { return parseFloat(d[self.attrx])})).nice();
		this.yScale.domain(d3.extent(this.data, function(d) { return parseFloat(d[self.attry])})).nice();

		var domainIngreso= [
			" De $600 mil a $800 mil ",
			" De $800 mil a $1 millón "
		]
		this.yScaleIngreso = d3.scale.ordinal()
			.domain([" De $600 mil a $800 mil "," De $800 mil a $1 millón "])
			.rangePoints([this.height, 0], 1);

		//alert(this.yScaleIngreso(" De $600 mil a $800 mil "));


		d3.select(".x.axis")
			.transition()
			.duration(2000)
			.call(this.xAxis)
			.select("text.label")	
				.transition()
				.text(this.etiquetas[this.attrx]);;

		this.nodes = this.svg.selectAll("circle")
			.data(this.filtereData, function(d) {return d.ID})

		this.nodes.exit()
				.transition()
				.duration(2000)
				.attr("cx", 0)
				.attr("cy", 0)
				.attr("r", 0)
				.remove()
		
		this.nodes.enter()
				.append("circle")
				.on("mouseenter", function(d) {
					pos = {x:d3.event.x, y:d3.event.y}
					self.tooltip.show(d, pos)}
					)
				.on("mouseleave", function(d) {self.tooltip.hide()})

		this.nodes
				.transition()
				.duration(2000)
				.attr("cx", function(d) {return self.xScale(self.cleanStringInt(d[self.attrx]))})
				.attr("cy", function(d) {return self.yScale(self.cleanStringInt(d[self.attry]))})
				.attr("r", function(d) {return self.radious(d[self.attrsize])})
				.attr("fill", function(d) {return color(d[self.attrcolor])})



	},


	render: function() {
		self = this; // Para hacer referencia a "this" en callback functions

		this.data = _.map(this.data, function(d) {
			d.desercionagno1 = parseFloat(d.desercionagno1.replace(/\.|%/g,'').replace(/,/g,'.')).toString();
			d.duracion = (parseFloat(d.duracion.replace(/,/g,'.'))/2).toString();
			d.arancel = (parseFloat((d.arancel+"").replace(/\.|\$| /g,''))/1000000);
			d.empleabilidadagno1 = parseFloat(d.empleabilidadagno1.replace(/\.|%/g,'').replace(/,/g,'.')).toString();
			return d;
		})

		this.carrerasXArea = d3.nest()
			.key(function(d) {return d.area})
			.entries(this.data);

		d3.select(this.el).append("select")
			.attr("class", "area")
			.selectAll("option")
			.data(this.carrerasXArea)
			.enter()
				.append("option")
				.attr("value", function(d) {return d.key})
				.text(function(d) {return  d.key})

		this.etiquetas = {
			"desercionagno1": "Deserción Año 1 (%)",
			"duracion": "Duración (años)",
			"arancel" : "Arancel (millones $)",
			"empleabilidadagno1" : "Empleabilidad Año 1 (%)"
		};
			

		var opciones = ["desercionagno1","duracion", "arancel",  "empleabilidadagno1"];

		d3.select(this.el).append("select")
			.attr("class", "attrx")
			.selectAll("option")
			.data(opciones)
			.enter()
				.append("option")
				.attr("value", function(d) {return d})
				.text(function(d) {return self.etiquetas[d]})


			// Genera elemento SVG contenedor principal de gráficos
		this.svg = d3.select(this.el).append("svg")
		    .attr("width", this.width + this.margin.left + this.margin.right)
		    .attr("height", this.height + this.margin.top + this.margin.bottom)
		  .append("g")
		    .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
	
			// Genera escalas utilizadas en gráfico X/Y
		this.xScale = d3.scale.linear()
    		.range([0, this.width]);

		this.yScale = d3.scale.linear()
    		.range([this.height, 0]);

		// Calcula el dominio de las escalas en base al valos de los datos que van en ejes 
		// x (psu Lenguaje) e y (financiamiento)
		this.xScale.domain(d3.extent(this.data, function(d) { return parseFloat(self.cleanStringInt(d[self.attrx]))})).nice();
		this.yScale.domain(d3.extent(this.data, function(d) { return parseFloat(self.cleanStringInt(d[self.attry]))})).nice();

		// Escala para calcular el radio de cada circulo
		this.radious = d3.scale.sqrt()
			.range([2, 15])
			.domain(d3.extent(this.data, function(d) { return parseFloat(d[self.attrsize])}));

	
		this.xAxis = d3.svg.axis()
		    .scale(this.xScale)
		    .orient("bottom");

		this.yAxis = d3.svg.axis()
		    .scale(this.yScale)
		    .orient("left");

		this.svg.append("g")
		  .attr("class", "x axis")
		  .attr("transform", "translate(0," + this.height + ")")
		  .attr("opacity",1)
		  .call(this.xAxis)
		.append("text")
		  .attr("class", "label")
		  .attr("x", this.width)
		  .attr("y", -6)
		  .style("text-anchor", "end")
		  .text(this.etiquetas[this.attrx]);

		this.svg.append("g")
		  .attr("class", "y axis")
		  .call(this.yAxis)
		  .attr("opacity",1)
		.append("text")
		  .attr("class", "label")
		  .attr("transform", "rotate(-90)")
		  .attr("y", 6)
		  .attr("dy", ".71em")
		  .style("text-anchor", "end")
		  .text(this.etiquetas[this.attry])


		this.updateNodes();

		$("body").append(this.tooltip.render().$el);

	}

});

// VistaToolTipEstablecimiento
// ----------------------------
// Muestra tooltip con mini ficha del establecimiensto (se ubica al hacer rollover sobre el establecimiento)
var VistaToolTipEstablecimiento = Backbone.View.extend({

	initialize: function() {
		this.datoestablecimiento = {
			nombre_establecimiento : "sin establecimiento",
			rbd:0,
			nombre_comuna : "sin comuna",
			financiamiento : 0,
			psu_lenguaje : 0,
			psu_matematica : 0,
			ive_media : 0,
			numero_alumnos : 0
		}
	},

	// show
	// ----
	// Genera el menaje a mostrar (de acuerdo a datos ingresados) y muestra el tooltip en la
	// posición indicada
	//
	// data: {nombre_establecimientos:"Escuela Arturo Prat", rbd: 123, ...}
	// pos : {x: 100, y: 250}
	show: function(data, pos) {
		$tooltip = this.$el;
		$tooltipcontent = $tooltip.find(".tooltipcontent")


		$tooltipcontent.html(this.message(data));

		$tooltip.css({"top":pos.y+10+$(window).scrollTop(), "left":pos.x-200});

		$tooltip.show();
	},

	hide: function() {
		$tooltip = this.$el;
		$tooltip.hide();
	},

	message: function(data) {
		var format = d3.format(",d")
		msg = data.nombre;
		/*
		msg = data.nombre+" ("+data.rbd + ") -"+data.nombre_comuna;
		msg += "<br>Financiamiento público 2011: $" + format(data.financiamiento)
		msg += "<br>PSU Leng: " + data.psu_lenguaje +" PSU Mat: "  + data.psu_matematica;
		msg += "<br>Índice de vulnerabilidad (media): " + Math.round(data.ive_media)+"%";
		msg += "<br>Matrícula total: " + data.numero_alumnos +" ( $"+format(Math.round(data.financiamiento/data.numero_alumnos))+"/est. en promedio)";
*/
		return msg
	},


	render: function() {
		$tooltip = this.$el
		$tooltip.hide();
		$tooltip.attr("style", "background:#ffff99;width:350px;position:absolute;z-index:9999");

		$tooltipcontent = $("<div>")
			.attr("class", "tooltipcontent")
			.attr("style", "padding:4px;border:1px solid");

		$tooltip.append($tooltipcontent);
		$tooltip.appendTo($("body"));

		this.hide();

		return this;
	}
});

 
