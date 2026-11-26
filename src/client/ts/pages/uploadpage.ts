import { Page } from 'harmony-browser-utils';
import { JSONObject } from 'harmony-types';
import { createElement, createShadowRoot } from 'harmony-ui';
import { fetchApi } from 'harmony-utils';
import { WORKSHOP_URL } from 'loadout';
import uploadCSS from '../../css/upload.css';

export class UploadPage extends Page {
	#shadowRoot?: ShadowRoot;
	#isLogged = false;

	constructor() {
		super('upload');
		this.htmlElement.append('UploadPage');
	}

	override async activated(): Promise<void> {
		const { response } = await fetchApi<JSONObject>(WORKSHOP_URL, 'get-my-items', 1);

		if (response.success) {
			this.#isLogged = true;
		} else {
			this.#isLogged = false;
		}
	}

	override async deactivated(): Promise<void> { }

	#initHTML(): HTMLElement {
		this.#shadowRoot = createShadowRoot('div', {
			adoptStyle: uploadCSS,
			childs: [
				createElement('div', {
					child: createElement('img', {
						src: './img/sits_02.png',
						class: 'sits',
						$click: () => this.#steamSignin(),
					}),
				}),
			],
		});

		return this.#shadowRoot?.host as HTMLElement;
	}

	#steamSignin(): void {
		document.location = '/openid';
	}

	get htmlElement() {
		return this.#shadowRoot?.host as (HTMLElement | undefined) ?? this.#initHTML();
	}
}
