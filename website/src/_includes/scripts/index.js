// @ts-check
//# Responsive width
let isMobile = false;
window.addEventListener(
	"DOMContentLoaded",
	() => {
		const mobileMatchMedia = matchMedia("(max-width: 768px)");
		isMobile = mobileMatchMedia.matches;

		mobileMatchMedia.addListener((e) => {
			isMobile = e.matches;

			// Close the mobile sidebar when switching from mobile to desktop
			if (isMobileSidebarVisible && !isMobile && isMobileSidebarVisible) {
				toggleMobileSidebar();
			}
		});
	},
);

//# Table of Contents
const originalTitle = document.title;
const headerMobile = document.querySelector(".header-mobile");
const tocList = document.querySelector(".toc");

/** @type {HTMLElement}*/
const siteNavigation = document.querySelector(".site-navigation-container");

/** @type {HTMLElement}*/
const tocContainer = document.querySelector(".toc-menu");

/** @type {Array<HTMLAnchorElement>}*/
const tocLinks = Array.from(document.querySelectorAll(".toc a"));

/** @type {Array<{
 * heading: HTMLElement,
 * link: HTMLAnchorElement,
 * }>} */
const headingElements = tocLinks.map((link) => {
	return {
		heading: document.querySelector(
			`[id="${link.getAttribute("href").slice(1)}"]`,
		),
		link,
	};
});

/**
 * @typedef {Object} CalculatedHeading
 * @property {string} id
 * @property {HTMLAnchorElement} link
 * @property {Array<string>} titles
 * @property {number} level
 * @property {number} start
 * @property {number} end
 */

class TableOfContents {
	constructor() {
		/** @type {Array<CalculatedHeading>}*/
		this.headingsCalculated = [];

		/** @type {boolean}*/
		this.hasInitializedHeadings = false;

		/** @type {undefined | number}*/
		this.lastActiveHeading = undefined;

		/** @type {boolean}*/
		this.isNavCollapsed = false;

		/** @type {undefined | number}*/
		this.navHeight = undefined;
	}

	/**
	 * @param {MouseEvent} event
	 */
	handleTOCClick(event) {
		const target = event.target;
		event.preventDefault();
		if (!(target instanceof HTMLElement)) {
			return;
		}

		if (target.hasAttribute("href")) {
			const hash = target.getAttribute("href");
			window.location.hash = hash;
			this.scrollToHeading(hash, true);

			if (isMobile) {
				toggleMobileSidebar();
			}
		}
	}

	/**
	 * @returns {number}
	 */
	getScrollY() {
		return scrollY + this.getScrollOffset();
	}

	/**
	 * @returns {number}
	 */
	getScrollOffset() {
		let offset = 0;

		// Account for mobile header
		if (isMobile) {
			offset += headerMobile.clientHeight;
		}

		// Give everything a tiny bit of margin so it's not up against the edges
		offset += 20;

		return offset;
	}

	/**
	 * @param {HTMLElement} heading
	 * @returns {number}
	 */
	getHeadingTop(heading) {
		return heading.offsetTop - this.getScrollOffset();
	}

	/**
	 * @param {number} i
	 * @param {Array<CalculatedHeading>} stack
	 * @returns {CalculatedHeading}
	 */
	calculateHeading(i, stack) {
		const {heading, link} = headingElements[i];
		const id = `#${heading.getAttribute("id")}`;

		// Extract the level from the H tag
		const level = Number(heading.tagName[1]);

		// Get the headings above this one for us in document.title
		/** @type {Array<string>}*/
		let titles = [heading.textContent.trim()];
		for (let i = stack.length - 1; i >= 0; i--) {
			const heading = stack[i];
			if (heading.level < level) {
				titles = heading.titles.concat(titles);
				break;
			}
		}

		// Calculate when this heading ends. It's either at the beginning of the next heading, or page bottom.
		let start = this.getHeadingTop(heading);
		let end;

		const nextHeading = headingElements[i + 1];
		if (nextHeading) {
			end = this.getHeadingTop(nextHeading.heading);
		} else {
			end = document.body.clientHeight;
		}

		return {
			level,
			id,
			titles,
			link,
			start,
			end,
		};
	}

	calculateHeadingsPositions() {
		// Don't calculate heading positions unless we've scrolled down
		if (!this.hasInitializedHeadings && scrollY <= 100) {
			return;
		}

		// If we've calculated all the headings then we just need to validate the last one
		// and if it's the same we can skip.
		if (this.hasInitializedHeadings) {
			const i = headingElements.length - 1;
			const existing = this.headingsCalculated[i];
			const recalculated = this.calculateHeading(i, []);
			if (
				recalculated.start === existing.start &&
				recalculated.end === existing.end
			) {
				return;
			}
		}

		this.hasInitializedHeadings = true;
		this.headingsCalculated = [];
		for (let i = 0; i < headingElements.length; i++) {
			this.headingsCalculated.push(
				this.calculateHeading(i, this.headingsCalculated),
			);
		}
	}

	/**
	 * @param {number} i
	 * @returns {boolean}
	 */
	isActive(i) {
		const {start, end} = this.headingsCalculated[i];
		const scrollY = this.getScrollY();
		return scrollY >= start && scrollY <= end;
	}

	/**
	 * @param {number} i
	 * @param {boolean} activating
	 */
	toggleActive(i, activating) {
		const {link, titles} = this.headingsCalculated[i];

		if (activating) {
			document.title = `${titles.join(": ")} — ${originalTitle}`;
		} else {
			document.title = originalTitle;
		}

		/** @type {null | Element}*/
		let target = link;
		while (target != null && target.tagName !== "DIV") {
			if (target.tagName === "LI") {
				target.classList.toggle("active");
			}
			target = target.parentElement;
		}
	}

	ensureCalculatedHeadings() {
		if (!this.hasInitializedHeadings) {
			this.calculateHeadingsPositions();
		}
	}

	checkActive() {
		if (this.lastActiveHeading !== undefined) {
			if (this.isActive(this.lastActiveHeading)) {
				this.checkNavigationCollapse(true);
				return;
			} else {
				this.toggleActive(this.lastActiveHeading, false);
				this.lastActiveHeading = undefined;
			}
		}

		this.ensureCalculatedHeadings();

		let hasActive = false;

		for (let i = 0; i < this.headingsCalculated.length; i++) {
			if (this.isActive(i)) {
				// Set the heading as active
				this.lastActiveHeading = i;
				this.toggleActive(i, true);
				hasActive = true;

				// Make sure TOC link is visible
				let linkTop =
					this.headingsCalculated[i].link.offsetTop - tocContainer.offsetTop;
				if (i === 0) {
					linkTop = 0;
				}
				const visibleStart = tocContainer.scrollTop;
				const visibleEnd = tocContainer.scrollTop + tocContainer.clientHeight;
				const isVisible = linkTop > visibleStart && linkTop < visibleEnd;
				if (!isVisible) {
					tocContainer.scrollTop = linkTop;
				}

				break;
			}
		}

		this.checkNavigationCollapse(hasActive);
	}

	/**
	 * @param {boolean} hasActive
	 */
	checkNavigationCollapse(hasActive) {
		// Only collapse navigation if we scroll over 300px
		let isCollapsed = hasActive && this.getScrollY() >= 500;
		if (isCollapsed && this.isNavCollapsed === isCollapsed) {
			return;
		}

		this.isNavCollapsed = isCollapsed;

		if (!this.navHeight) {
			this.navHeight = siteNavigation.clientHeight;
		}

		if (isCollapsed) {
			siteNavigation.style.height = "0px";
		} else {
			siteNavigation.style.height = `${this.navHeight}px`;
		}
	}

	/**
	 * @param {string} hash
	 * @param {boolean} smooth
	 * @returns {boolean}
	 */
	scrollToHeading(hash, smooth) {
		const heading = document.getElementById(hash.replace(/^(#)/, ""));
		if (!heading) {
			return false;
		}

		heading.setAttribute("tabindex", "-1");
		heading.focus();

		this.ensureCalculatedHeadings();
		window.scrollTo({
			top: this.getHeadingTop(heading),
			left: 0,
			behavior: smooth ? "smooth" : undefined,
		});
		this.checkActive();
		return true;
	}

	/**
	 * Fully scroll and copy hash to tech when clicking an anchor next to a heading
	 *
	 * @param {MouseEvent} event
	 * @param {HTMLElement} target
	 */
	handleHeadingAnchorClick(event, target) {
		event.preventDefault();

		const hash = target.getAttribute("href");
		window.location.hash = hash;
		this.scrollToHeading(hash, true);
		navigator.clipboard.writeText(window.location.href);

		// Only another copied text can appear here so delete it if it exists
		if (target.nextElementSibling != null) {
			target.nextElementSibling.remove();
		}

		const copied = document.createElement("span");
		copied.classList.add("header-copied");
		copied.textContent = "Copied to clipboard";
		target.parentElement.appendChild(copied);
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				copied.style.opacity = "0";
			});
		});
		copied.addEventListener(
			"transitionend",
			() => {
				copied.remove();
			},
		);
	}

	/**
	* Intercept link clicks, if they are just hashes on the current page then
	* just scroll
	*
	* @param {MouseEvent} event
	* @param {HTMLElement} target
	*/
	handleAnchorClick(event, target) {
		let href = target.getAttribute("href");
		if (href === undefined) {
			return;
		}

		// Remove current origin
		if (href.startsWith(location.origin)) {
			href = href.slice(location.origin.length);
		}

		// Remove current pathname
		if (href.startsWith(location.pathname)) {
			href = href.slice(location.pathname.length);
		}

		// If href starts with a hash then it's referring to the current page
		if (href[0] !== "#") {
			return;
		}

		if (this.scrollToHeading(href, true)) {
			event.preventDefault();
		}
	}

	attach() {
		this.checkActive();

		if (window.location.hash !== "") {
			this.scrollToHeading(window.location.hash, false);
		}

		tocList.addEventListener("click", this.handleTOCClick.bind(this), false);
		window.addEventListener(
			"resize",
			this.calculateHeadingsPositions.bind(this),
			{capture: false, passive: true},
		);
		window.addEventListener(
			"scroll",
			this.checkActive.bind(this),
			{capture: false, passive: true},
		);
		window.addEventListener(
			"resize",
			this.checkActive.bind(this),
			{capture: false, passive: true},
		);

		document.addEventListener(
			"click",
			(event) => {
				const {target} = event;
				if (!(target instanceof HTMLElement)) {
					return;
				}

				if (event.ctrlKey || event.metaKey) {
					return;
				}

				if (target.matches(".header-anchor")) {
					this.handleHeadingAnchorClick(event, target);
				}

				if (target.matches("a")) {
					this.handleAnchorClick(event, target);
				}
			},
			false,
		);
	}
}

const toc = new TableOfContents();

window.addEventListener(
	"DOMContentLoaded",
	() => {
		toc.attach();
	},
);

//# Team list shuffle

/**
 * @template T
 * @param {Array<T>} array
 * @returns {Array<T>}
 */
function randomShuffle(array) {
	let count = array.length;
	let temp;
	let index;
	while (count) {
		index = Math.floor(Math.random() * count--);
		temp = array[count];
		array[count] = array[index];
		array[index] = temp;
	}

	return array;
}

const teamLists = document.querySelectorAll(".team-list");
for (const teamList of teamLists) {
	const items = teamList.querySelectorAll("li");
	for (const li of randomShuffle(Array.from(items))) {
		teamList.appendChild(li);
	}
}

//# Code expanders

const collapsed = document.querySelectorAll("pre.collapsed");
for (const elem of collapsed) {
	elem.addEventListener(
		"click",
		() => {
			elem.classList.remove("collapsed");
		},
	);
}

//# Color scheme switcher

function toggleColorSchemeSwitch() {
	let currentScheme = window.localStorage.getItem("data-theme");
	if (currentScheme == null) {
		const prefersDarkMode = matchMedia("(prefers-color-scheme: dark)").matches;
		currentScheme = prefersDarkMode ? "dark" : "light";
	}

	const newScheme = currentScheme === "dark" ? "light" : "dark";
	window.localStorage.setItem("data-theme", newScheme);
	document.documentElement.classList.add("transition");
	document.documentElement.setAttribute("data-theme", newScheme);
}

const colorSchemeSwitcher = document.querySelector(".color-scheme-switch");
colorSchemeSwitcher.addEventListener("click", toggleColorSchemeSwitch, false);

//# Mobile navigation

const mobileSidebarHandle = document.querySelector(".mobile-handle");
const sidebar = document.querySelector(".sidebar");
let isMobileSidebarVisible = false;
function toggleMobileSidebar() {
	isMobileSidebarVisible = !isMobileSidebarVisible;
	mobileSidebarHandle.classList.toggle("active");
	sidebar.classList.toggle("visible");
	document.body.classList.toggle("no-scroll");
}
mobileSidebarHandle.addEventListener(
	"click",
	(event) => {
		event.preventDefault();
		toggleMobileSidebar();
	},
	false,
);

//# Docsearch
// Only initialize on focus

const docsearchInput = document.querySelector("#docsearch");
docsearchInput.addEventListener(
	"focus",
	() => {
		// Stylesheet
		const link = document.createElement("link");
		link.href = "/docsearch.css";
		link.rel = "stylesheet";
		document.body.appendChild(link);

		// Script
		const script = document.createElement("script");
		script.src = "/docsearch.js";
		script.async = true;
		script.defer = true;
		script.addEventListener(
			"load",
			() => {
				// @ts-ignore
				return window.docsearch({
					apiKey: "66db1ad366d458c6acded7cbc23dba7e",
					indexName: "romefrontend",
					inputSelector: "#docsearch",
					debug: false, // Set debug to true if you want to inspect the dropdown
				});
			},
		);
		document.body.appendChild(script);
	},
	{once: true},
);

//# Header scrolls to top
let topAnchors = Array.from(document.querySelectorAll("[href='#top']"));
if (location.pathname === "/") {
	topAnchors = [...topAnchors, ...document.querySelectorAll(".logo")];
}
for (const elem of topAnchors) {
	elem.addEventListener(
		"click",
		(e) => {
			if (window.scrollY > 0) {
				e.preventDefault();

				window.scrollTo({
					top: 0,
					left: 0,
					behavior: "smooth",
				});

				// Remove the hash
				history.pushState(
					"",
					document.title,
					window.location.pathname + window.location.search,
				);
			}
		},
	);
}