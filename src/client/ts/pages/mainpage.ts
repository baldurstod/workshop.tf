import { CanvasAttributes, CanvasLayout, CanvasView, Graphics } from 'harmony-3d';
import { Page, ShortcutHandler } from 'harmony-browser-utils';
import { createElement, createShadowRoot, hide, I18n, show } from 'harmony-ui';
import { ItemFilterAttribute, STEAM_WORKSHOP_URL, Tf2CharacterManager, Tf2CharacterToClass, Tf2ItemManager, Tf2ItemTemplate, Tf2LoadoutController } from 'loadout';
import mainCSS from '../../css/main.css';
import { LOADOUT_LAYOUT, MAIN_CANVAS } from '../constants';
import { loadoutScene } from '../loadout/scene';

export class MainPage extends Page {
	#shadowRoot?: ShadowRoot;
	#htmlItemList?: HTMLElement;
	#mainCanvas: CanvasAttributes | null = null;
	#htmlCanvas!: HTMLCanvasElement;
	#itemsInitialized = false;
	#htmlItems = new Map<string, HTMLElement>();
	#imgIntersectionObserver: IntersectionObserver;
	#images = new Map<HTMLImageElement, string>();

	constructor() {
		super('');
		Tf2LoadoutController.addEventListener('itemsloaded', () => this.#refreshItems());

		const callback: IntersectionObserverCallback = (entries, observer) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					const img = (entry.target as HTMLImageElement);
					const src = this.#images.get(img);
					if (src) {
						img.src = src;
						observer.unobserve(img);
					}
				}
			});
		};
		this.#imgIntersectionObserver = new IntersectionObserver(callback);
	}

	activated(): void {
		this.#initItems();

	}

	deactivated(): void {

	}

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
			autoResize: true,
			useLayout: LOADOUT_LAYOUT,
		});

		if (this.#mainCanvas) {
			this.#htmlCanvas = this.#mainCanvas.canvas;
			ShortcutHandler.addContext('3dview', this.#htmlCanvas);
		} else {
			// TODO: display error
		}

		this.#shadowRoot = createShadowRoot('div', {
			adoptStyle: mainCSS,
			class: 'mainpage',
			childs: [
				this.#htmlItemList = createElement('div', {
					class: 'items',
					child: createElement('div', { class: 'spacer' }),
				}),
				createElement('div', {
					class: 'viewer',
					child: this.#htmlCanvas,
				}),
			],
		});
		I18n.observeElement(this.#shadowRoot);

		this.#htmlItemList.addEventListener('scroll', () => this.#handleItemsScroll(), { passive: true });
		// Refresh item in case the window is resized
		new ResizeObserver(() => this.#refreshItems()).observe(this.#htmlItemList);

		return this.#shadowRoot?.host as HTMLElement;
	}

	get htmlElement() {
		return this.#shadowRoot?.host as (HTMLElement | undefined) ?? this.#initHTML();
	}

	async #initItems(): Promise<void> {
		if (this.#itemsInitialized) {
			return;
		}
		Tf2LoadoutController.dispatchEvent('setitemfilter', { detail: { attribute: ItemFilterAttribute.Workshop, value: true } })
		Tf2LoadoutController.dispatchEvent('setitemfilter', { detail: { attribute: ItemFilterAttribute.DisplayCosmetics, value: true } })
		await Tf2ItemManager.initWorkshopItems();
		this.#itemsInitialized = true;
	}

	#refreshItems(): void {
		for (const [, htmlItem] of this.#htmlItems) {
			hide(htmlItem);
		}

		const selectedItems = Tf2ItemManager.getSelectedItems();
		const excludedItems = { e: 0 };
		const [items, conflictingItems] = Tf2ItemManager.getFilteredItems(excludedItems);

		const w = this.#htmlItemList!.clientWidth;
		const elementSize = 150;//OptionsManager.getItem('app.css.variables.item-manager-item-size') as number ?? 150;
		const columns = w / elementSize;
		const offset = (columns % 1) * elementSize / 2;
		this.#htmlItemList!.style.setProperty('--item-size', `${elementSize}px`);
		this.#htmlItemList!.style.setProperty('--offset', `${offset}px`);

		let row = 0;
		let column = 0;
		for (const [id, item] of items) {
			let htmlItem = this.#htmlItems.get(id);
			if (htmlItem) {
				//this.#htmlItemsContainer?.append(htmlItem);
				show(htmlItem);
			} else {
				let img: HTMLImageElement;
				htmlItem = createElement('div', {
					class: 'item',
					childs: [
						img = createElement('img', {
							$click: () => this.#itemClicked(item),
						}),
						createElement('div', {
							class: 'links',
							childs: [
								createElement('a', {
									href: `${STEAM_WORKSHOP_URL}${item.id.substring(1)}`,
									target: '_blank',
									innerText: item.name,
									title: item.name,
								}),
							],
						}),
					],
				});

				this.#imgIntersectionObserver.observe(img);
				this.#images.set(img, item.imageInventory ?? '');

				this.#htmlItems.set(id, htmlItem);
			}
			htmlItem?.classList.remove('conflicting');

			htmlItem.style.position = 'absolute';
			htmlItem.style.setProperty('--row', String(row));
			htmlItem.style.setProperty('--column', String(column));
			const top = String(row * elementSize);
			const left = String(column * elementSize + offset);
			htmlItem.setAttribute('top', top);
			htmlItem.setAttribute('left', left);

			if (selectedItems.has(id)) {
				htmlItem?.classList.add('item-selected');
			} else {
				htmlItem?.classList.remove('item-selected');
				if (conflictingItems.has(id)) {
					htmlItem?.classList.add('conflicting');
				}
			}

			++column;
			if (column + 1 > columns) {
				// Wrap to the next row
				column = 0;
				++row;
			}
		}

		this.#htmlItemList!.style.setProperty('--rows', String(row));

		this.#handleItemsScroll();
	}

	#handleItemsScroll(): void {
		const scrollTop = this.#htmlItemList!.scrollTop;

		for (const [, item] of this.#htmlItems) {
			const itemTop = Number(item.getAttribute('top'));
			if (itemTop + 200 > scrollTop && itemTop < scrollTop + this.#htmlItemList!.clientHeight) {
				this.#htmlItemList!.append(item);
			} else {
				item.remove();
			}
		}
	}

	async #itemClicked(item: Tf2ItemTemplate): Promise<void> {
		console.info(`Clicked: ${item.id}`, item);

		// Pick the first class
		const usedBy = item.getUsedByClasses().entries().next().value;
		if (!usedBy) {
			console.warn('can\'t find used by', item);
			return;
		}

		const tf2Class = Tf2CharacterToClass[usedBy[0]];
		if (tf2Class === undefined) {
			console.warn('can\'t find class', item);
			return;
		}

		const character = await Tf2CharacterManager.selectCharacter(tf2Class, loadoutScene, 0);

		await character.toggleItem(item);
	}
}
