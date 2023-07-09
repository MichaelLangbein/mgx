import { select, pointer } from 'd3-selection';
import { scaleBand, scaleLinear, scaleOrdinal } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { colorScale as gvColorScale } from './graph';


export interface Datum { date: string, value: number };

export function createBarchart(container: HTMLElement, timeSeries: Datum[], xLabel: string, yLabel: string, widthTotal: number, heightTotal: number) {


    /**
     *   -------------------------svg-----------------
     *   |    -----------------graph---------------  |                      
     *   |    | y  |--------center---------------| | |  
     *   | y  | a  |                             | | |    
     *   | l  | x  |                             | | |  
     *   | a  | i  |                             | | |  
     *   | b  | s  |                             | | | 
     *   | e  |    |-----------------------------| | | 
     *   | l  |           x-axis                   | | 
     *   |    -------------------------------------  |
     *   |          x-label                          |
     *   ---------------------------------------------
     */


    const margin = { top: 10, right: 10, bottom: 10, left: 20 };
    const width = widthTotal - margin.left - margin.right;
    const height = heightTotal - margin.top - margin.right;

    const base = select(container);
    const svg = base
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewport', `0, 0, ${widthTotal}, ${heightTotal}`);

    // x-label
    const xLabelContainer = svg.append('text')
        .attr('class', 'xLabel')
        .style('text-anchor', 'middle')
        .attr('transform', `translate(${widthTotal / 2}, ${heightTotal - margin.bottom / 2})`)
        .text(xLabel);

    // y-label
    const yLabelContainer = svg.append('text')
        .attr('class', 'yLabel')
        .attr('transform', `translate(${margin.left / 2}, ${height / 2}) rotate(-90)`)
        .style('text-anchor', 'middle')
        .text(yLabel);


    // central canvas including axes, but without x- and y-label
    const graph = svg
        .append('g')
        .attr('class', 'graph')
        .attr('width', width)
        .attr('height', height)
        .attr('transform', `translate(${margin.left}, ${margin.top})`);



    // x-axis
    const barNames = timeSeries.map(d => d.date);
    const xScale = scaleBand()
        .domain(barNames)
        .range([0, width - 40]) // should be `- yAxis.width`, but we don't know that yet.
        .padding(0.2);
    const xAxisGenerator = axisBottom(xScale);
    graph.append('g')
        .attr('class', 'xAxis')
        .call(xAxisGenerator);
    // rotating x-labels
    const letterSize = 10;
    const maxLabelSize = barNames.reduce((c, n) => n.length > c ? n.length : c, 0) * letterSize;
    const tickSize = xAxisGenerator.tickSize();
    if (maxLabelSize > tickSize) {
        graph.select('.xAxis').selectAll('.tick').selectAll('text')
            .attr('text-anchor', 'start')
            .attr('transform', () => {
                const rotation = 60;
                const transform = `translate(${letterSize / 2}, ${letterSize / 2}) rotate(${rotation})`;
                return transform;
            })
    }
    const xAxis = graph.select<SVGGElement>('.xAxis');
    const xAxisSize = xAxis.node()!.getBBox();


    // y-axis
    const minVal = timeSeries.reduce((c, v) => Math.min(c, v.value), Infinity);
    const maxVal = timeSeries.reduce((c, v) => Math.max(c, v.value), -Infinity);
    const padding = 0.1 * (maxVal - minVal);
    const startVal = minVal === 0.0 ? minVal : minVal - padding;
    const endVal = maxVal + padding;
    const yScale = scaleLinear()
        .domain([startVal, endVal])
        .range([height - xAxisSize.height, 0]);
    const yAxisGenerator = axisLeft(yScale);
    graph.append('g')
        .attr('class', 'yAxis')
        .call(yAxisGenerator);
    const yAxis = graph.select<SVGGElement>('.yAxis');
    const yAxisSize = yAxis.node()!.getBBox();

    xAxis.attr('transform', `translate(${yAxisSize.width}, ${height - xAxisSize.height})`);
    yAxis.attr('transform', `translate(${yAxisSize.width}, 0)`);



    // center: actual plot without x- and y-axis
    const centerHeight = height - xAxisSize.height;
    const centerWidth = width - yAxisSize.width;
    const center = graph
        .append('g')
        .attr('class', 'center')
        .attr('transform', `translate(${yAxisSize.width}, 0)`)
        .attr('width', centerWidth)
        .attr('height', centerHeight);



    const barColors: string[] = timeSeries
            .map(d => gvColorScale(d.value))
            .map(v => `rgb(${v.r}, ${v.g}, ${v.b})`);
    const colorScale = scaleOrdinal()
            .domain(barNames)
            .range(barColors);

    // bars
    const bars = center.selectAll('.bar')
        .data(timeSeries)
        .enter()
        .append('g')
        .attr('class', 'bar')
        .attr('transform', (d: any) => `translate(${xScale(d.label)}, 0)`);

    // bars: append rect
    bars.append('rect')
        .attr('width', xScale.step())
        .attr('height', (d: Datum) => centerHeight - yScale(d.value))
        .attr('y', (d: Datum) => yScale(d.value))
        .attr('fill', (d: Datum) => {
            const v = gvColorScale(d.value);
            return `rgb(${v.r}, ${v.g}, ${v.b})`;
        });




    // bars: hover-effect
    const maxWidthHoverText = 200;
    const infobox = base.append('div')
        .style('max-width', `${maxWidthHoverText}px`)
        .style('visibility', 'hidden')
        .style('position', 'absolute')
        .style('display', 'block')
        .style('z-index', 1000)
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "1px")
        .style("border-radius", "3px")
        .style('padding', '3px');
    const infoboxP = infobox.append('p');

    bars.on('mouseenter', (evt: any, datum: Datum) => {
        infobox.style('visibility', 'visible');
        const text = `${yLabel}: ${datum.value}`;
        infoboxP.html(text);
        const positionInsideSvg = pointer(evt, svg.node());  // doesn't seem to work in popup
        const positionInLayer = [evt.layerX, evt.layerY];    // doesn't seem to work in raw html
        let x = Math.min(positionInsideSvg[0], positionInLayer[0]);
        if (x > centerWidth / 2) {
            x -= maxWidthHoverText;
        }
        const y = Math.min(positionInsideSvg[1], positionInLayer[1]);
        infobox
            .style('left', `${x}px`)
            .style('top', `${y}px`);

        const rgb = gvColorScale(datum.value);
        const fillColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        bars.select('rect').attr('fill', 'lightgray');
        select(evt.target).select('rect').attr('fill', fillColor);
        xAxis.selectAll('text').attr('color', 'lightgray');
        const n = xAxis.selectAll('text').nodes()!.find((n: any) => n.innerHTML === datum.date)!;
        select(n).attr('color', 'black');
    })
    .on('mouseleave', (evt: any, datum: Datum) => {
        infobox.style('visibility', 'hidden');
        bars.selectAll('rect').attr('fill', (d: any) => {
            const v = gvColorScale(d.value);
            return `rgb(${v.r}, ${v.g}, ${v.b})`;
        });
        xAxis.selectAll('text').attr('color', 'currentColor');
    });
}