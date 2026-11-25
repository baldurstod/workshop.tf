import { ContextType, Graphics, GraphicsEvents, GraphicTickEvent, MergeRepository, Repositories, ShaderPrecision, Source1MaterialManager, Source1ModelManager, Source1ParticleControler, WebGLStats, WebRepository } from 'harmony-3d';
import { NotificationsPlacement, OptionsManager, setNotificationsPlacement, SinglePageApplication } from 'harmony-browser-utils';
import { JSONObject } from 'harmony-types';
import { documentStyle, enableHelp, I18n, I18nTranslation } from 'harmony-ui';
import { BugReport, BugReporter } from 'harmony-utils';
import { Tf2CharacterManager, Tf2Team } from 'loadout';
import htmlCSS from '../css/html.css';
import varsCSS from '../css/vars.css';
import english from '../json/i18n/english.json';
import { TF2_REPOSITORY } from './constants';
import { activeCameraControl, loadoutScene, orbitCamera } from './loadout/scene';
import { MainPage } from './pages/mainpage';
import { UploadPage } from './pages/uploadpage';
import { ApplicationPanel } from './view/applicationpanel';
//import { ApplicationPanel } from './view/applicationpanel';

documentStyle(htmlCSS);
documentStyle(varsCSS);

BugReporter.addEventListener('report', (event: Event) => {
	console.info('bug report', (event as CustomEvent<BugReport>).detail);
})

class Application extends SinglePageApplication {
	#appView = new ApplicationPanel();
	#translations = new Map<string, I18nTranslation>();
	#documentStyleSheet = new CSSStyleSheet();
	#playing = true;
	#fetchRedirect = new Map<string, string>();
	#tf2WebRepository = new WebRepository('tf2', TF2_REPOSITORY, true);

	static {
		I18n.setOptions({ translations: [english as I18nTranslation] });
		I18n.start();
		enableHelp();
	}

	constructor() {
		super();
		this.init([
			new MainPage(),
			new UploadPage(),
		]);
		this.#init();
	}

	async #init(): Promise<void> {
		setNotificationsPlacement(NotificationsPlacement.Bottom);
		document.adoptedStyleSheets.push(this.#documentStyleSheet);
		await this.#initGraphics();
		//this.#initHTML();
		this.#iniRepositories();
		this.#start();
	}

	async #initGraphics(): Promise<void> {
		let contextType: ContextType = 'webgl';

		await Graphics.initCanvas({
			useOffscreenCanvas: true,
			autoResize: true,
			type: contextType,
			webGL: {
				alpha: true,
				premultipliedAlpha: true,
				depth: true,
			},
			webGPU: {
				configuration: {
					alphaMode: 'premultiplied',
				},
			}
		});

		Graphics.setShaderPrecision(ShaderPrecision.High);
	}

	#iniRepositories(): void {
		Repositories.addRepository(new MergeRepository('tf2', this.#tf2WebRepository));

		Source1ModelManager.loadManifest('tf2');
		Source1ParticleControler.loadManifest('tf2');
		Source1MaterialManager.addRepository('tf2');

		this.#tf2WebRepository.supportedExtensions.add('vmt');
		this.#tf2WebRepository.supportedExtensions.add('vtf');

		fetch(TF2_REPOSITORY + `materials_manifest.json?t=${new Date().getTime()}`).then(async (response) => {
			const j = await response.json();
			if (!j) {
				return;
			}

			this.#tf2WebRepository.setFiles(j);
		});
	}

	#start(): void {
		this.#translations.set('english', english);
		this.#startupRenderer();
	}

	#resetCamera(): void {
		OptionsManager.resetItem('app.cameras.orbit.position');
		OptionsManager.resetItem('app.cameras.orbit.quaternion');
		OptionsManager.resetItem('app.cameras.orbit.target');
		loadoutScene.addChild(orbitCamera);
	}

	setCssTheme(theme: string): void {
		document.documentElement.classList.remove('dark');
		document.documentElement.classList.remove('light');

		if (theme == 'dark' || theme == 'light') {
			document.documentElement.classList.add(theme);
		}
	}

	#startupRenderer(): void {
		const animate = (event: Event): void => {
			WebGLStats.tick();
			const delta = (event as CustomEvent<GraphicTickEvent>).detail.delta;
			activeCameraControl.update(delta);

			/*if (this.#composer?.enabled) {
				this.#composer.render((event as CustomEvent).detail.delta, {});
			} else */{
				//Graphics.render(loadoutScene, loadoutScene.activeCamera ?? this.#activeCamera, (event as CustomEvent).detail.delta, {});
				Graphics.renderMultiCanvas(delta, (event as CustomEvent<GraphicTickEvent>).detail.context);
			}
			/*
			if (this.#recording) {
				this.recordFrame();
			}
			*/
			/*
			if (this.#showFps) {
				this.#htmlCanvasFps.innerText = String(WebGLStats.getFps());
			}
			*/

			/*
			if (this.#lightsRotateWithCamera) {
				let v = vec3.clone(this.#orbitCamera.position);
				v[2] = 0;
				//lightsContainer.lookAt(this.#orbitCamera.position);
				vec3.normalize(v, v);
				quat.rotationTo(lightsContainer._quaternion, [0, -1, 0], v);
			}
			*/
		}
		Graphics.play();
		GraphicsEvents.addEventListener('tick', animate);
		//GraphicsEvents.addEventListener('tick', (event: Event) => this.#activeCameraControl.update((event as CustomEvent).detail.delta));

		//ContextObserver.observe(GraphicsEvents, this.#orbitCamera);
		//ContextObserver.observe(GraphicsEvents, this.#firstPersonCamera);
	}

	setTeam(team: Tf2Team): void {
		Tf2CharacterManager.setTeam(team);
	}

	#setLang(lang: string): void {
		this.#getLanguage(lang).then(json => {
			I18n.setOptions({ translations: [json as I18nTranslation] });
			I18n.setLang(lang);
		});
	}

	async #getLanguage(lang: string): Promise<JSONObject> {
		const translation = this.#translations.get(lang);
		if (translation) {
			return translation;
		}

		const p = new Promise<JSONObject>(resolve => {
			void (async (): Promise<void> => {
				const response = await fetch(`/json/i18n/${lang}.json`);

				const json = await response.json();
				resolve(json);
			})();
		});
		this.#translations.set(lang, await p as I18nTranslation);
		return p;
	}

	async initApplication(): Promise<void> {
		/*
		createElement('div', {
			parent: window.document.body,
			child: this.htmlElement,
		});
		*/

	}

	pageActivated(): void {

	}

	get htmlElement(): ShadowRoot {
		return this.#appView.shadowRoot;
	}
}
new Application();


const originalFetch = window.fetch;

window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
	let url: URL;
	if (input instanceof Request) {
		url = new URL(input.url);
	} else {
		url = new URL(input);
	}

	if (url.host === 'ugc.workshop.tf') {
		const result = /^\/(\d*)\/(\d*)\/(\d*)\/(.*)/.exec(url.pathname);
		if (result?.length === 5) {
			url.pathname = `/${result[1]}/${result[2]}/${result[4]}`;
		}
	}

	return originalFetch(url, init);
}
