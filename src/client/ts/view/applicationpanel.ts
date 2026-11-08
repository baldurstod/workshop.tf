import { I18n, createShadowRoot, defineHarmonyRadio, defineHarmonySwitch, defineHarmonyTab, defineHarmonyTabGroup, documentStyle } from 'harmony-ui';
import applicationCSS from '../../css/application.css';
import htmlCSS from '../../css/html.css';
import varsCSS from '../../css/vars.css';
import { MainPanel } from './mainpanel';

documentStyle(htmlCSS);
documentStyle(varsCSS);

export class ApplicationPanel {
	#shadowRoot!: ShadowRoot;
	#mainContent = new MainPanel();

	static {
		defineHarmonySwitch();
		defineHarmonyRadio();
		defineHarmonyTab();
		defineHarmonyTabGroup();
	}

	constructor() {
		this.#initHTML();
	}

	#initHTML(): void {
		this.#shadowRoot = createShadowRoot('div', {
			parent: document.body,
			adoptStyle: applicationCSS,
			childs: [
				this.#mainContent.getHTMLElement(),
			],
		});
		I18n.observeElement(this.#shadowRoot);
	}
}
