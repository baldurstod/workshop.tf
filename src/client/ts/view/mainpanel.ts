import { CanvasAttributes, CanvasLayout, CanvasView, Graphics } from 'harmony-3d';
import { ShortcutHandler } from 'harmony-browser-utils';
import { createElement, createShadowRoot, I18n } from 'harmony-ui';
import mainCSS from '../../css/main.css';
import { LOADOUT_LAYOUT, MAIN_CANVAS } from '../constants';
import { loadoutScene } from '../loadout/scene';

export class MainPanel {
	#shadowRoot?: ShadowRoot;
	#htmlItemList?: HTMLElement;
	#mainCanvas: CanvasAttributes | null = null;
	#htmlCanvas!: HTMLCanvasElement;

	#initHTML(): HTMLElement {
		this.#mainCanvas = Graphics.addCanvas({
			name: MAIN_CANVAS,
			layouts: [
				new CanvasLayout(LOADOUT_LAYOUT,
					[
						new CanvasView({
							name: 'main',
							scene: loadoutScene,
						}),
					],
				),
			],
			useLayout: LOADOUT_LAYOUT,
		});

		if (this.#mainCanvas) {
			this.#htmlCanvas = this.#mainCanvas.canvas;
			this.#htmlCanvas.width = 400;
			this.#htmlCanvas.height = 665;
			ShortcutHandler.addContext('3dview', this.#htmlCanvas);
		} else {
			// TODO: display error
		}

		this.#shadowRoot = createShadowRoot('div', {
			adoptStyle: mainCSS,
			childs: [
				this.#htmlItemList = createElement('div'),
				this.#htmlCanvas,
			],
		});
		I18n.observeElement(this.#shadowRoot);
		return this.#shadowRoot?.host as HTMLElement;
	}

	getHTMLElement(): HTMLElement {
		return this.#shadowRoot?.host as (HTMLElement | undefined) ?? this.#initHTML();
	}
}
