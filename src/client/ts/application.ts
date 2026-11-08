import { ContextType, Graphics, GraphicsEvents, GraphicTickEvent, MergeRepository, Repositories, ShaderPrecision, Source1MaterialManager, Source1ModelManager, Source1ParticleControler, WebGLStats, WebRepository } from 'harmony-3d';
import { addNotification, NotificationsPlacement, NotificationType, OptionsManager, setNotificationsPlacement } from 'harmony-browser-utils';
import { JSONObject } from 'harmony-types';
import { createElement, documentStyle, enableHelp, I18n, I18nTranslation } from 'harmony-ui';
import { BugReport, BugReporter } from 'harmony-utils';
import { Tf2CharacterManager, Tf2Team } from 'loadout';
import htmlCSS from '../css/html.css';
import varsCSS from '../css/vars.css';
import english from '../json/i18n/english.json';
import { TF2_GROUP_URL, TF2_REPOSITORY } from './constants';
import { activeCameraControl, loadoutScene, orbitCamera } from './loadout/scene';
import { ApplicationPanel } from './view/applicationpanel';

documentStyle(htmlCSS);
documentStyle(varsCSS);

BugReporter.addEventListener('report', (event: Event) => {
	console.info('bug report', (event as CustomEvent<BugReport>).detail);
})

class Application {
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

		if (OptionsManager.getItem('engine.renderer.experimentalwebgpu')) {
			contextType = 'webgpu';
		}

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

	#showAboutLayer(): void {
		const html = `${I18n.getString('#loadout_tf_service_provided')}<a href="http://steamcommunity.com/id/baldurstod/" target="_blank">Baldurs Tod</a><br>
		<a href="https://www.redbubble.com/people/Loadout/shop?asc=u" target="_blank">${I18n.getString('#redbubble_shop')}</a><br>
		${I18n.getString('#model_texture_files_property')}<a href="http://www.valvesoftware.com/" target="_blank">Valve Corporation</a><br>
		${I18n.getString('#valve_tf_trademarks')}`;

		addNotification(html, NotificationType.Info, 15);
	}

	#showBugNotification(): void {
		const html = createElement('div', {
			childs: [
				createElement('a', {
					style: 'color:white;display:block;',
					href: TF2_GROUP_URL,
					target: '_blank',
					i18n: '#get_assistance_on_steam',
				}),
				createElement('a', {
					style: 'color:white;display:block;',
					href: 'https://discord.gg/7EhW2WCWyQ',//TODO: const
					target: '_blank',
					i18n: '#get_assistance_on_discord',
				}),
			]
		});
		addNotification(html, NotificationType.Info, 15);
	}
}
new Application();
