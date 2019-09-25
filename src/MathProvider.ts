import * as _ from 'lodash';
//@ts-ignore
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor';
//@ts-ignore
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html';
//@ts-ignore
import { TeX } from 'mathjax-full/js/input/tex';
//@ts-ignore
import ParseUtil from 'mathjax-full/js/input/tex/ParseUtil';
import TexParser from 'mathjax-full/js/input/tex/TexParser';
//@ts-ignore
import { mathjax } from 'mathjax-full/js/mathjax';
//@ts-ignore
import { SVG } from 'mathjax-full/js/output/svg';
import { MathToSVGConfig, mathToSVGDefaultConfig } from './Config';

function parseSize(size: string | number, config: Partial<MathToSVGConfig> = {}) {
    if (typeof size === 'number') return size;
    const unit = size.substr(-2);
    return _.get(config, unit, 1) * parseFloat(size);
}

/**
 * 
 * @param math
 * @param config
 */
function toSVG(math: string, config: Partial<MathToSVGConfig> = {}) {
    const opts = _.defaultsDeep(config, mathToSVGDefaultConfig);
    //
    //  Create DOM adaptor and register it for HTML documents
    //
    const adaptor = liteAdaptor();
    RegisterHTMLHandler(adaptor);

    //
    //  Create input and output jax and a document using them on the content from the HTML file
    //
    const tex = new TeX({ packages: opts.packages });
    const svg = new SVG({ fontCache: (opts.fontCache ? 'local' : 'none') });
    const html = mathjax.document('', { InputJax: tex, OutputJax: svg });
    //console.log(tex.findMath(['$$\\cos(x)$$', 'asdddsac $$x+5$$']))
    
    try {
        TexParser.prototype.Parse = function() {
            let c: string;
            let n: number;
            while (this.i < this.string.length) {
                c = this.string.charAt(this.i++);
                n = c.charCodeAt(0);
                if (n >= 0xD800 && n < 0xDC00) {
                    c += this.string.charAt(this.i++);
                }

                this.parse('character', [this, c]);
            }
        }
        
        let parser = new TexParser(math,
            { display: true, isInner: false },
            tex.parseOptions);
        //parser.Parse()
        parser.i = 0;
        while (parser.i < parser.string.length) {
            console.log(parser.GetArgument(math, true))
        }
        //parser.Parse();
        console.log('fffff', tex.parseOptions.handlers.get('character').parse([parser, '2']))
        
        /*
        console.log(parser.string)
        console.log(parser.i)
        console.log('next',parser.GetNext())
        //console.log(parser.GetArgument)
        
        */
    }
    catch (err) {
        console.log(err)
    }
    
    //
    //  Typeset the math
    //
    
    const node = html.convert(math, {
        display: !opts.inline,
        em: opts.em,
        ex: opts.ex,
        containerWidth: opts.width
    });
    //
    //  If the --css option was specified, output the CSS,
    //  Otherwise, typeset the math and output the HTML
    //

    /*
     * handled in native (android)
     * 
    const svgNode = adaptor.firstChild(node);
    const width = parseSize(adaptor.getAttribute(svgNode, 'width'), config);
    const height = parseSize(adaptor.getAttribute(svgNode, 'height'), config);
    */
    /*
    const nodeList = buildMathSVGArray(adaptor.clone(adaptor.firstChild(node)));
    const response = _.map(nodeList, node => _.replace(adaptor.outerHTML(node), /xlink:xlink/g, 'xlink'))
    */
    const stringSVG = _.replace(opts.css ? adaptor.textContent(svg.styleSheet(html)) : adaptor.innerHTML(node), /xlink:xlink/g, 'xlink');

    return stringSVG;
}

function buildMathSVGArray(node: any) {
    let pathToDefs: Array<number | string> = [0];
    const response: any[] = [];
    //console.log( node.attributes)
    recurseThroughTree(node, (childNode, path) => {
        if (childNode.kind === 'defs') pathToDefs = path;
        else if (_.startsWith(_.join(path), _.join(pathToDefs))) return;

        if (childNode.kind === 'use') {
            
            const treeNodeList = _.map(_.without(path, 'children'), (key, index, collection) => {
                const p = _.slice(collection, 0, index + 1);
                return _.get(node, _.flatten(_.map(p, seg => (['children', seg]))));
            });
            
            const tree = _.reduceRight(_.initial(treeNodeList), (prev, curr, index, list) => {
                return _.assign({}, curr, { children: [prev] });
            }, _.last(treeNodeList));
            
            response.push(_.set(_.assign({}, node), 'children', [_.get(node, `children.0`), tree]));
        }
    });

    return response;
}

function recurseThroughTree(node: any, callback: (node: string, path: string[]) => any, path: string[] = []) {
    path.push('children');
    _.map(node.children, (child, key) => {
        const p = _.concat(path, key);
        callback(child, p)
        recurseThroughTree(child, callback, p)
    });
}

export const mathToSVG = _.memoize(toSVG);