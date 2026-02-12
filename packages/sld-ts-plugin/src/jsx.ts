import ts from "typescript";



/**
 * Converts a TypeScript SourceFile containing SLD templates into JSX code.
 * Assumes SLD templates are defined as tagged template literals with `sld`.
 */
export function sourceFileToJsx(sourceFile: ts.SourceFile): string {
    let jsxParts: string[] = [];

    function visit(node: ts.Node) {
        // Look for tagged template literals with tag 'sld'
        if (
            ts.isTaggedTemplateExpression(node) &&
            ts.isIdentifier(node.tag) &&
            node.tag.text === "sld"
        ) {
            const template = node.template;
            if (ts.isNoSubstitutionTemplateLiteral(template)) {
                jsxParts.push(template.text);
            } else if (ts.isTemplateExpression(template)) {
                // For simplicity, just concatenate the raw text and ignore expressions
                let text = template.head.text;
                for (const span of template.templateSpans) {
                    text += `{${span.expression.getText(sourceFile)}}${span.literal.text}`;
                }
                jsxParts.push(text);
            }
        }
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    // Combine all found SLD templates into a single JSX string
    return jsxParts.join("\n");
}