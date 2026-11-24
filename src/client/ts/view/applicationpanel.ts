import { I18n, createShadowRoot, defineHarmonyRadio, defineHarmonySwitch, defineHarmonyTab, defineHarmonyTabGroup, documentStyle } from 'harmony-ui';
import applicationCSS from '../../css/application.css';
import htmlCSS from '../../css/html.css';
import varsCSS from '../../css/vars.css';

documentStyle(htmlCSS);
documentStyle(varsCSS);

export class ApplicationPanel {
	#shadowRoot!: ShadowRoot;

	static {
		defineHarmonySwitch();
		defineHarmonyRadio();
		defineHarmonyTab();
		defineHarmonyTabGroup();
	}

	constructor() {
		this.#initHTML();
	}

	#initHTML(): HTMLElement {
		this.#shadowRoot = createShadowRoot('div', {
			parent: document.body,
			class: 'ApplicationPanel',
			adoptStyle: applicationCSS,
			childs: [
				//this.#mainContent.getHTMLElement(),
			],
		});
		I18n.observeElement(this.#shadowRoot);
		return this.#shadowRoot?.host as HTMLElement;
	}

	get htmlElement(): HTMLElement {
		return this.#shadowRoot?.host as (HTMLElement | undefined) ?? this.#initHTML();
	}

	get shadowRoot(): ShadowRoot {
		if (!this.#shadowRoot) {
			this.#initHTML();
		}
		return this.#shadowRoot;
	}
}
