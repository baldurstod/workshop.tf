import { CanvasAttributes, CanvasLayout, CanvasView, Graphics, KvReader, PathPrefixRepository, Repositories, Source1ModelManager, ZipRepository } from 'harmony-3d';
import { Page, ShortcutHandler } from 'harmony-browser-utils';
import { JSONObject } from 'harmony-types';
import { createElement, createShadowRoot, defineHarmonyInput, display, HarmonyEventListener, HTMLHarmonyInputElement, updateElement } from 'harmony-ui';
import { fetchApi } from 'harmony-utils';
import { WORKSHOP_UGC_IMG_PREFIX, WORKSHOP_URL } from 'loadout';
import uploadCSS from '../../css/upload.css';
import { loadoutScene } from '../loadout/scene';

type Stage = 'unlogged' | 'logged' | 'selectstyle' | 'uploading';

const UPLOAD_CANVAS = 'upload_canvas';
const UPLOAD_LAYOUT = 'upload';

export class UploadPage extends Page {
	#shadowRoot?: ShadowRoot;
	#htmlSits?: HTMLDivElement;
	#htmlItemList?: HTMLDivElement;
	#htmlStyleSelector?: HTMLDivElement;
	#htmlStyleSelectorItem?: HTMLDivElement;
	#htmlStyleSelectorStyles?: HTMLDivElement;
	#htmlUpload?: HTMLDivElement;
	#htmlUploadItem?: HTMLDivElement;
	#htmlDeleteItemButton?: HTMLButtonElement;
	#htmlStyleTitle?: HTMLHarmonyInputElement;
	#htmlFileDrop?: HTMLInputElement;
	#htmlFilesDescriptors?: HTMLDivElement;
	#uploadCanvas: CanvasAttributes | null = null;
	#htmlCanvas!: HTMLCanvasElement;
	//#isLogged = false;
	#items: JSONObject[] = [];
	#uploadedItems: JSONObject[] = [];
	#selectedItem?: JSONObject;
	#selectedStyle: number | null = null;
	#selectedFile: File | null = null;
	#uploadReady = false;
	#stage: Stage = 'unlogged';
	//#files = new Map2<string, string, File>();

	constructor() {
		super('upload');
		defineHarmonyInput();
		//this.htmlElement.append('UploadPage');

		document.addEventListener('dragover', event => {
			event.stopPropagation();
			event.preventDefault();
			if (event.dataTransfer) {
				if (this.#stage === 'uploading') {
					event.dataTransfer.dropEffect = 'copy';
				} else {
					event.dataTransfer.dropEffect = 'none';
				}
			}
		});
		document.addEventListener('drop', event => {
			event.stopPropagation();
			event.preventDefault();
			this.#prepareFiles(event.dataTransfer?.files)
		});
	}

	override async activated(): Promise<void> {
		const { response } = await fetchApi<JSONObject>(WORKSHOP_URL, 'get-my-items', 1);

		if (response.success) {
			this.#items = (response.result!.items as JSONObject[] | undefined) ?? [];
			this.#uploadedItems = (response.result!.uploaded as JSONObject[] | undefined) ?? [];
			this.#setStage('logged');
		} else {
			this.#items = [];
			this.#uploadedItems = [];
			this.#setStage('unlogged');
		}
	}

	override async deactivated(): Promise<void> { }

	#setStage(stage: Stage): void {
		this.#stage = stage;
		this.#refreshHTML();
	}

	#initHTML(): void {
		if (this.#shadowRoot) {
			return;
		}

		this.#uploadCanvas = Graphics.addCanvas({
			name: UPLOAD_CANVAS,
			layouts: [
				new CanvasLayout(UPLOAD_LAYOUT,
					[
						new CanvasView({
							name: 'main',
							scene: loadoutScene,
						}),
					],
				),
			],
			autoResize: true,
			useLayout: UPLOAD_LAYOUT,
		});

		if (this.#uploadCanvas) {
			this.#htmlCanvas = this.#uploadCanvas.canvas;
			ShortcutHandler.addContext('3dview', this.#htmlCanvas);
		} else {
			// TODO: display error
		}

		this.#shadowRoot = createShadowRoot('div', {
			adoptStyle: uploadCSS,
			childs: [
				this.#htmlSits = createElement('div', {
					hidden: true,
					child: createElement('img', {
						src: './img/sits_02.png',
						class: 'sits',
						$click: () => this.#steamSignin(),
					}),
				}),
				this.#htmlItemList = createElement('div', { hidden: true, }),
				this.#htmlStyleSelector = createElement('div', {
					class: 'select-style',
					hidden: true,
					childs: [
						createElement('div', {
							childs: [
								createElement('div', {
									class: 'back-button',
									i18n: '#back_to_the_item_list',
									$click: () => this.#setStage('logged'),
								}),
								this.#htmlStyleSelectorItem = createElement('div'),
								this.#htmlStyleSelectorStyles = createElement('div', {
									class: 'styles',
								}),
							]
						}),
						createElement('div', {
							class: 'viewer',
							child: this.#htmlCanvas,
						}),
					]
				}),
				this.#htmlUpload = createElement('div', {
					class: 'upload',
					hidden: true,
					childs: [
						createElement('div', {
							childs: [
								createElement('div', {
									class: 'back-button',
									i18n: '#back_to_the_item_list',
									$click: () => this.#setStage('logged'),
								}),
								this.#htmlUploadItem = createElement('div'),
								this.#htmlDeleteItemButton = createElement('button', {
									i18n: '#delete_item',
									$click: () => this.#deleteStyle(),
								}),

								this.#htmlStyleTitle = createElement('harmony-input', {
									i18n: '#name',
									//$change: (event: InputEvent) => this.#changeStyleTitle((event.target as HTMLInputElement).value),
								}),
								createElement('div', {
									class: 'file-drop',
									childs: [
										this.#htmlFileDrop = createElement('input', {
											type: 'file',
											'@accept': 'application/zip',
											$change: (event: InputEvent) => {
												event.stopPropagation();
												event.preventDefault();
												this.#prepareFiles((event.target as HTMLInputElement).files)
											},
										}),
										this.#htmlFilesDescriptors = createElement('div', {
											class: 'files-descriptors',
										}),
									]
								}),
							]
						}),
						createElement('div', {
							class: 'viewer',
							child: this.#htmlCanvas,
						}),
					],
				}),
			],
		});
	}

	#refreshHTML(): void {
		this.#initHTML();
		display(this.#htmlSits, this.#stage === 'unlogged');
		display(this.#htmlItemList, this.#stage === 'logged');
		display(this.#htmlStyleSelector, this.#stage === 'selectstyle');
		display(this.#htmlUpload, this.#stage === 'uploading');

		this.#htmlItemList!.replaceChildren();

		for (const item of this.#items) {
			createItem(item, this.#htmlItemList!, () => this.#selectItem(item));
		}

		this.#htmlStyleSelectorItem?.replaceChildren();
		this.#htmlStyleSelectorStyles?.replaceChildren();
		this.#htmlUploadItem?.replaceChildren();
		if (this.#selectedItem) {
			createItem(this.#selectedItem, this.#htmlStyleSelectorItem!);
			const styles = this.#getStyles(this.#selectedItem);
			console.info(styles);

			for (const [style, title] of styles) {
				createStyle(style, title, this.#htmlStyleSelectorStyles!, () => this.#selectStyle(style));
			}
			createStyle(null, null, this.#htmlStyleSelectorStyles!, () => this.#selectStyle(styles.size));

			updateElement(this.#htmlDeleteItemButton, {
				i18n: styles.size > 1 ? '#delete_style' : '#delete_item',
			});

			if (this.#selectedStyle !== null) {
				// Only display the delete item button if the style has been already
				display(this.#htmlDeleteItemButton, styles.has(this.#selectedStyle));
				// Only display the style rename for secondary styles
				display(this.#htmlStyleTitle, this.#selectedStyle > 0);
				const title = styles.get(this.#selectedStyle);
				this.#htmlStyleTitle!.value = `${title ?? this.#selectedItem.title as string} (style ${this.#selectedStyle})`;
			}
			//const title = this.#htmlStyleTitle

			// Create the item on top of the upload stage
			createItem(this.#selectedItem, this.#htmlUploadItem!);
		}
	}

	#getStyles(item: JSONObject): Map<number, string> {
		const styles = new Map<number, string>();
		for (const uploaded of this.#uploadedItems ?? []) {
			if (uploaded.publishedfileid === item.publishedfileid) {
				styles.set(uploaded.style as number, uploaded.title as string);
			}
		}
		return styles;
	}

	#steamSignin(): void {
		document.location = '/openid';
	}

	#selectItem(item: JSONObject): void {
		console.info('item selected:', item);
		this.#selectedItem = item;

		const styles = this.#getStyles(this.#selectedItem);
		if (styles.size) {
			// Go tot the style selector
			this.#selectedStyle = null;
			this.#setStage('selectstyle');
		} else {
			//No style uploaded, go straight to the upload page
			this.#selectStyle(0);
		}
	}

	#selectStyle(style: number): void {
		console.info('style selected:', style);
		this.#selectedStyle = style;
		this.#setStage('uploading');
		this.#selectedFile = null;
		this.#uploadReady = false;
	}

	#deleteStyle(): void {
		throw new Error("TODO");
	}

	/* TODO: remove
	#changeStyleTitle(title: string): void {
		throw new Error("TODO");
	}
	*/

	async #prepareFiles(files: FileList | undefined | null): Promise<void> {
		if (!files || this.#stage !== 'uploading') {
			return;
		}

		if (!this.#selectedItem) {
			return;
		}

		this.#htmlFilesDescriptors?.replaceChildren();

		for (const file of files) {
			// TODO: check warning if several files
			//this.#files.set(this.#selectedItem.publishedfileid as string, file.name, file);
			this.#selectedFile = file;
		}

		console.info(this.#selectedFile);
		this.#prepareFiles2();
	}

	async #prepareFiles2(): Promise<void> {
		this.#uploadReady = false;
		if (!this.#selectedFile || this.#stage !== 'uploading') {
			return;
		}

		console.info(this.#selectedFile);

		this.#htmlFilesDescriptors?.replaceChildren();

		const zipRepo = new ZipRepository('upload', this.#selectedFile);
		const textResponse = await zipRepo.getFileAsText('manifest.txt');

		if (textResponse.error) {
			return;
		}

		const repo = new PathPrefixRepository('upload', zipRepo, 'game')

		Repositories.addRepository(repo);

		console.info(textResponse);

		const root = new KvReader().readText(textResponse.text!);
		console.info(root);
		if (!root) {
			return;
		}
		const modelPlayer = root.getValue('importsession.itemschema.model_player') as string | undefined;
		const modelPlayerPerClass = root.getValue('importsession.itemschema.model_player_per_class') as string | undefined;
		console.info(modelPlayer, modelPlayerPerClass);
		if (!modelPlayer) {
			return;
		}

		const model = await Source1ModelManager.createInstance('upload', modelPlayer, true);
		console.info(model);
		if (model) {
			loadoutScene.addChild(model);
		}

		this.#uploadReady = true;
	}
	/*
	async #prepareFiles2(files: FileList | undefined | null): Promise<void> {
		if (!files || this.#stage !== 'uploading') {
			return;
		}
		console.info(files);

		this.#htmlFilesDescriptors?.replaceChildren();

		for (const file of files) {
			console.info(file)
			const zipRepo = new ZipRepository('upload', file);
			const textResponse = await zipRepo.getFileAsText('manifest.txt');

			if (textResponse.error) {
				continue;
			}

			const repo = new PathPrefixRepository('upload', zipRepo, 'game')

			Repositories.addRepository(repo);

			console.info(textResponse);

			const root = new KvReader().readText(textResponse.text!);
			console.info(root);
			if (!root) {
				continue;
			}
			const modelPlayer = root.getValue('importsession.itemschema.model_player') as string | undefined;
			const modelPlayerPerClass = root.getValue('importsession.itemschema.model_player_per_class') as string | undefined;
			console.info(modelPlayer, modelPlayerPerClass);
			if (!modelPlayer) {
				continue;
			}



			const model = await Source1ModelManager.createInstance('upload', modelPlayer, true);
			console.info(model);
			if (model) {
				loadoutScene.addChild(model);
			}
		}
	}
	*/

	get htmlElement() {
		this.#initHTML();
		return this.#shadowRoot?.host as HTMLElement;
	}
}

function createItem(item: JSONObject, parent: HTMLElement, click?: HarmonyEventListener): void {
	createElement('div', {
		parent,
		class: 'item',
		childs: [
			createElement('img', {
				src: WORKSHOP_UGC_IMG_PREFIX + item.preview_url,
			}),
			createElement('span', {
				innerText: item.title as string,
			}),
		],
		$click: click,
	});
}

function createStyle(style: number | null, title: string | null, parent: HTMLElement, click?: HarmonyEventListener): void {
	createElement('div', {
		parent,
		class: 'style',
		childs: [
			style !== null && createElement('div', {
				class: 'update',
				childs: [
					createElement('div', {
						innerText: title as string,
					}),
					createElement('div', {
						i18n: {
							innerText: '#update_style_#',
							values: {
								style,
							},
						},
					}),
				],
			}),
			style === null && createElement('span', {
				class: 'create',
				i18n: '#add_a_new_style',
			}),
		],
		$click: click,
	});
}
