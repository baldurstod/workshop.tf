import { I18n, createElement, createShadowRoot, documentStyle } from 'harmony-ui';
import applicationCSS from '../../css/application.css';
import htmlCSS from '../../css/html.css';
import varsCSS from '../../css/vars.css';
import { Controller } from '../controller';

documentStyle(htmlCSS);
documentStyle(varsCSS);

export class ApplicationPanel {
	#shadowRoot?: ShadowRoot;
	#htmlMain?: HTMLElement;

	#initHTML(): HTMLElement {
		if (!this.#shadowRoot) {
			this.#shadowRoot = createShadowRoot('div', {
				parent: document.body,
				adoptStyle: applicationCSS,
				childs: [
					createElement('div', {
						class: 'header',
						childs: [
							createElement('button', {
								innerText: 'upload',
								$click: () => Controller.dispatchEvent('navigateto', { detail: 'upload' }),
							})
						]
					}),
					this.#htmlMain = createElement('div'),
					createElement('div', {
						class: 'footer',
					}),
				],
			});
			I18n.observeElement(this.#shadowRoot);
		}
		return this.#shadowRoot?.host as HTMLElement;
	}

	get htmlElement(): HTMLElement {
		this.#initHTML()
		return this.#htmlMain!;
	}

	get shadowRoot(): ShadowRoot {
		if (!this.#shadowRoot) {
			this.#initHTML();
		}
		return this.#shadowRoot!;
	}
}
