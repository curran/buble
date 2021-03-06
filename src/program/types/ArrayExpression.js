import Node from '../Node.js';
import spread, { isArguments, inlineSpreads } from '../../utils/spread.js';

export default class ArrayExpression extends Node {
	initialise(transforms) {
		if (transforms.spreadRest && this.elements.length) {
			const lexicalBoundary = this.findLexicalBoundary();

			let i = this.elements.length;
			while (i--) {
				const element = this.elements[i];
				if (
					element &&
					element.type === 'SpreadElement' &&
					isArguments(element.argument)
				) {
					this.argumentsArrayAlias = lexicalBoundary.getArgumentsArrayAlias();
				}
			}
		}

		super.initialise(transforms);
	}

	transpile(code, transforms) {
		super.transpile(code, transforms);

		if (transforms.spreadRest) {
			inlineSpreads(code, this, this.elements);
			// erase trailing comma after last array element if not an array hole
			if (this.elements.length) {
				const lastElement = this.elements[this.elements.length - 1];
				if (
					lastElement &&
					/\s*,/.test(code.original.slice(lastElement.end, this.end))
				) {
					code.overwrite(lastElement.end, this.end - 1, ' ');
				}
			}

			if (this.elements.length === 1) {
				const element = this.elements[0];

				if (element && element.type === 'SpreadElement') {
					// special case – [ ...arguments ]
					if (isArguments(element.argument)) {
						code.overwrite(
							this.start,
							this.end,
							`[].concat( ${this.argumentsArrayAlias} )`
						); // TODO if this is the only use of argsArray, don't bother concating
					} else {
						code.overwrite(this.start, element.argument.start, '[].concat( ');
						code.overwrite(element.end, this.end, ' )');
					}
				}
			} else {
				const hasSpreadElements = spread(
					code,
					this.elements,
					this.start,
					this.argumentsArrayAlias
				);

				if (hasSpreadElements) {
					code.overwrite(this.end - 1, this.end, ')');
				}
			}
		}
	}
}
