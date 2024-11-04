const MA_counties = "./data/towns.topojson"; // TopoJSON file
const gini_index = "./data/gini_index.csv"; // Gini index data

const fipsData = [
    { "county": "Barnstable County, Massachusetts", "fips_code": 25001 },
    { "county": "Berkshire County, Massachusetts", "fips_code": 25003 },
    { "county": "Bristol County, Massachusetts", "fips_code": 25005 },
    { "county": "Dukes County, Massachusetts", "fips_code": 25007 },
    { "county": "Essex County, Massachusetts", "fips_code": 25009 },
    { "county": "Franklin County, Massachusetts", "fips_code": 25011 },
    { "county": "Hampden County, Massachusetts", "fips_code": 25013 },
    { "county": "Hampshire County, Massachusetts", "fips_code": 25015 },
    { "county": "Middlesex County, Massachusetts", "fips_code": 25017 },
    { "county": "Nantucket County, Massachusetts", "fips_code": 25019 },
    { "county": "Norfolk County, Massachusetts", "fips_code": 25021 },
    { "county": "Plymouth County, Massachusetts", "fips_code": 25023 },
    { "county": "Suffolk County, Massachusetts", "fips_code": 25025 },
    { "county": "Worcester County, Massachusetts", "fips_code": 25027 }
];

Promise.all([
    d3.json(MA_counties),
    d3.csv(gini_index)
]).then(data => {
    const topoData = data[0];
    const giniData = data[1];

    // Convert TopoJSON to GeoJSON
    const geojson = topojson.feature(topoData, topoData.objects.ma);

    console.log("GeoJSON Feature Properties: ", geojson.features[0].properties);
    console.log("Gini Data: ", giniData);

    // Map FIPS codes to Gini data using the fips_code column
    const fipsMap = {};
    giniData.forEach(d => {
        const fipsCode = parseInt(d.fips_code);
        const fipsEntry = fipsData.find(f => f.fips_code === fipsCode);

        if (fipsEntry) {
            fipsMap[fipsEntry.fips_code] = +d["Estimate!!Gini Index"];
            console.log(`Mapping: ${fipsEntry.county} (${fipsEntry.fips_code}) -> Gini: ${d["Estimate!!Gini Index"]}`);
        } else {
            console.warn(`Mapping: ${fipsCode} -> Gini: undefined`);
        }
    });

    // SVG dimensions
    const svgWidth = window.innerWidth * 0.8;
    const svgHeight = window.innerHeight / 3;

    // Color scales
    const colorScalePopulation = d3.scaleLinear()
        .domain(d3.extent(geojson.features, d => d.properties.POP1980))
        .range(['#f7fbff', '#08306b']);

    const colorScaleChange = d3.scaleDiverging(d3.interpolateRdBu)
        .domain([
            d3.min(geojson.features, d => d.properties.POP2010 - d.properties.POP1980),
            0,
            d3.max(geojson.features, d => d.properties.POP2010 - d.properties.POP1980)
        ]);

    const colorScaleGini = d3.scaleSequential(d3.interpolateViridis)
        .domain(d3.extent(Object.values(fipsMap)));

    // Tooltip
    const tooltip = d3.select("#tooltip");

    // Function to create maps
    const createMap = (container, colorScale, property, isGini = false) => {
        const svg = d3.select(container).append("svg")
            .attr("width", svgWidth)
            .attr("height", svgHeight);

        const projection = d3.geoMercator().fitSize([svgWidth, svgHeight], geojson);
        const path = d3.geoPath().projection(projection);

        svg.selectAll("path")
            .data(geojson.features)
            .enter().append("path")
            .attr("d", path)
            .attr("fill", d => {
                if (isGini) {
                    const fips = String(d.properties.FIPS_STCO);
                    const giniValue = fipsMap[fips];
                    console.log(`Fill for FIPS: ${fips} -> ${giniValue}`);
                    return colorScale(giniValue || 0);
                } else if (typeof property === 'function') {
                    return colorScale(property(d));
                }
                return colorScale(d.properties[property]);
            })
            .on("mouseenter", (event, d) => {
                const value = isGini ? fipsMap[d.properties.FIPS_STCO] : d.properties[property];
                tooltip.style("opacity", 1)
                    .html(`${d.properties.TOWN || d.properties.county}: ${value !== undefined ? value : 'N/A'}`)
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY + 10}px`);
            })
            .on("mousemove", event => {
                tooltip.style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY + 10}px`);
            })
            .on("mouseleave", () => {
                tooltip.style("opacity", 0);
            });
    };

    createMap(".fig1", colorScalePopulation, "POP1980");
    createMap(".fig2", colorScaleChange, d => d.properties.POP2010 - d.properties.POP1980);
    createMap(".fig3", colorScaleGini, null, true);
});
