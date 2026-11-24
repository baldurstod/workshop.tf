import { Page } from 'harmony-browser-utils';
import { createElement } from 'harmony-ui';

export class UploadPage extends Page {
	readonly htmlElement = createElement('div');

	constructor() {
		super('upload');
		this.htmlElement.append('UploadPage');
	}

	activated(): void {

	}

	deactivated(): void {

	}
}
