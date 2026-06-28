document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname;
    const siteHeader = document.getElementById('site-header');
    const siteFooter = document.getElementById('site-footer');
    const hasGsapScroll = typeof window.gsap !== 'undefined' && typeof window.ScrollToPlugin !== 'undefined';

    if (hasGsapScroll) {
        window.gsap.registerPlugin(window.ScrollToPlugin);
    }

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const isInertialScrollDisabled = () => {
        if (document.documentElement?.dataset.disableInertialScroll === 'true') {
            return true;
        }

        try {
            return window.localStorage?.getItem('disableInertialScroll') === 'true';
        } catch (error) {
            return false;
        }
    };

    const canUseGsapInertialScroll = hasGsapScroll && !prefersReducedMotion && !isInertialScrollDisabled();
    let wheelScrollTween = null;
    let setInertialScrollTarget = null;

    const getMaxScrollY = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    let maxScrollY = getMaxScrollY();
    const clampScrollY = (value) => Math.min(maxScrollY, Math.max(0, value));

    const setupInertialWheelScroll = () => {
        if (!canUseGsapInertialScroll) {
            return;
        }

        let targetScrollY = clampScrollY(window.scrollY || 0);
        setInertialScrollTarget = (value) => {
            targetScrollY = clampScrollY(value);
        };

        const restartWheelTween = () => {
            if (!wheelScrollTween) {
                wheelScrollTween = window.gsap.to(window, {
                    duration: 1,
                    ease: 'power3.out',
                    paused: true,
                    scrollTo: {
                        y: targetScrollY,
                        autoKill: false,
                    },
                });
            } else {
                wheelScrollTween.vars.scrollTo.y = targetScrollY;
                wheelScrollTween.invalidate();
            }

            wheelScrollTween.restart();
        };

        const syncTargetWithWindowScroll = () => {
            if (!wheelScrollTween || !wheelScrollTween.isActive()) {
                targetScrollY = clampScrollY(window.scrollY || 0);
            }
        };

        const hasScrollableParent = (element) => {
            let currentElement = element instanceof Element ? element : null;

            while (currentElement && currentElement !== document.body) {
                const style = window.getComputedStyle(currentElement);
                const canScrollY = /(auto|scroll|overlay)/.test(style.overflowY);
                if (canScrollY && currentElement.scrollHeight > currentElement.clientHeight) {
                    return true;
                }

                currentElement = currentElement.parentElement;
            }

            return false;
        };

        let scrollSyncFrame = null;
        window.addEventListener('scroll', () => {
            if (scrollSyncFrame) {
                return;
            }

            scrollSyncFrame = window.requestAnimationFrame(() => {
                syncTargetWithWindowScroll();
                scrollSyncFrame = null;
            });
        }, { passive: true });
        let resizeAnimationFrame = null;
        window.addEventListener('resize', () => {
            if (resizeAnimationFrame) {
                window.cancelAnimationFrame(resizeAnimationFrame);
            }

            resizeAnimationFrame = window.requestAnimationFrame(() => {
                maxScrollY = getMaxScrollY();
                targetScrollY = clampScrollY(targetScrollY);
                resizeAnimationFrame = null;
            });
        }, { passive: true });

        window.addEventListener('load', () => {
            maxScrollY = getMaxScrollY();
            targetScrollY = clampScrollY(targetScrollY);
        }, { once: true });

        window.addEventListener('wheel', (event) => {
            if (event.ctrlKey || event.metaKey) {
                return;
            }

            if (event.defaultPrevented || maxScrollY <= 0 || hasScrollableParent(event.target)) {
                return;
            }

            if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
                return;
            }

            event.preventDefault();
            targetScrollY = clampScrollY(targetScrollY + event.deltaY);
            restartWheelTween();
        }, { passive: false });
    };

    setupInertialWheelScroll();

    let headerOffset = siteHeader?.offsetHeight || 0;
    const updateHeaderOffset = () => {
        headerOffset = siteHeader?.offsetHeight || 0;
    };

    window.addEventListener('resize', updateHeaderOffset);

    const normalizePathname = (pathname) => {
        const normalized = pathname.replace(/\/index\.html$/, '/').replace(/\/+$/, '');
        return normalized === '' ? '/' : normalized;
    };
    const currentNormalizedPath = normalizePathname(window.location.pathname);

    const getScrollTargetY = (element) => {
        if (!element) {
            return 0;
        }

        return Math.max(0, element.getBoundingClientRect().top + window.pageYOffset - headerOffset);
    };

    const smoothScrollToY = (targetY) => {
        const scrollTop = Math.max(0, targetY);

        if (hasGsapScroll) {
            if (wheelScrollTween) {
                wheelScrollTween.kill();
                wheelScrollTween = null;
            }

            if (setInertialScrollTarget) {
                setInertialScrollTarget(scrollTop);
            }

            window.gsap.to(window, {
                duration: 0.8,
                ease: 'power2.out',
                scrollTo: {
                    y: scrollTop,
                    autoKill: true,
                },
            });
            return;
        }

        window.scrollTo({
            top: scrollTop,
            behavior: 'smooth',
        });
    };

    const smoothScrollToElement = (element) => {
        if (!element) {
            return;
        }

        smoothScrollToY(getScrollTargetY(element));
    };

    const smoothScrollToHash = (hash, updateHistory = true) => {
        if (!hash || hash === '#') {
            return false;
        }

        let target;
        try {
            target = document.querySelector(hash);
        } catch (error) {
            return false;
        }

        if (!target) {
            return false;
        }

        smoothScrollToElement(target);

        if (updateHistory) {
            if (window.location.hash === hash) {
                history.replaceState(null, '', hash);
            } else {
                history.pushState(null, '', hash);
            }
        }

        return true;
    };

    // Header and footer are now rendered by Hugo partials — no JS injection needed.

    document.querySelectorAll('a[href]').forEach((link) => {
        const href = link.getAttribute('href');
        if (!href || !href.includes('#')) {
            return;
        }

        let targetUrl;
        try {
            targetUrl = new URL(link.href, window.location.href);
        } catch (error) {
            return;
        }

        if (targetUrl.origin !== window.location.origin) {
            return;
        }

        const isSamePage = normalizePathname(targetUrl.pathname) === currentNormalizedPath;
        if (!isSamePage || !targetUrl.hash) {
            return;
        }

        link.addEventListener('click', (event) => {
            if (!smoothScrollToHash(targetUrl.hash)) {
                return;
            }

            event.preventDefault();
        });
    });

    const handleInitialHashScroll = () => {
        requestAnimationFrame(() => {
            updateHeaderOffset();
            smoothScrollToHash(window.location.hash, false);
        });
    };

    if (window.location.hash) {
        if (document.readyState === 'complete') {
            handleInitialHashScroll();
        } else {
            window.addEventListener('load', handleInitialHashScroll, { once: true });
        }
    }

    const contactForm = document.getElementById('contactForm');
    const contactEmail = 'ridwan.wicaksono@ugm.ac.id';

    if (contactForm) {
        contactForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const name = document.getElementById('name')?.value.trim() || 'Anonymous';
            const email = document.getElementById('email')?.value.trim() || 'Not provided';
            const interest = document.getElementById('interest')?.value.trim() || 'Not provided';
            const message = document.getElementById('message')?.value.trim() || '';

            const subject = encodeURIComponent(`Website inquiry from ${name}`);
            const body = encodeURIComponent(
                `Name/Organization: ${name}\n` +
                `Email Address: ${email}\n` +
                `Area of Interest: ${interest}\n\n` +
                `Message:\n${message}\n`
            );

            window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
        });
    }

    const sortBtn = document.getElementById('sortBtn');
    const sortDropdown = document.getElementById('sortDropdown');
    const sortConfirmBtn = document.getElementById('sortConfirmBtn');
    const searchInput = document.querySelector('.search-input');
    const searchConfirmBtn = document.getElementById('searchConfirmBtn');
    const pubCards = document.querySelectorAll('.pub-card');

    const closeSortDropdown = () => {
        sortDropdown?.classList.remove('show');
    };

    const applyPublicationSearch = () => {
        if (!searchInput || pubCards.length === 0) {
            return;
        }

        const query = searchInput.value.trim().toLowerCase();

        pubCards.forEach((card) => {
            const cardText = card.textContent.toLowerCase();
            card.style.display = query === '' || cardText.includes(query) ? '' : 'none';
        });
    };

    if (sortBtn && sortDropdown) {
        sortBtn.addEventListener('click', (event) => {
            sortDropdown.classList.toggle('show');
            event.stopPropagation();
        });

        document.addEventListener('click', (event) => {
            if (!sortDropdown.contains(event.target) && event.target !== sortBtn) {
                closeSortDropdown();
            }
        });

        const setupSortGroup = (groupId) => {
            const group = document.getElementById(groupId);
            if (!group) return;

            const buttons = group.querySelectorAll('.sort-option');
            buttons.forEach((button) => {
                button.addEventListener('click', () => {
                    buttons.forEach((btn) => btn.classList.remove('active'));
                    button.classList.add('active');
                });
            });
        };

        setupSortGroup('sortType');
        setupSortGroup('sortOrder');
    }

    if (sortConfirmBtn && sortDropdown) {
        sortConfirmBtn.addEventListener('click', () => {
            closeSortDropdown();
        });
    }

    if (searchConfirmBtn && searchInput) {
        searchConfirmBtn.addEventListener('click', applyPublicationSearch);
        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                applyPublicationSearch();
            }
        });
    }

    // --- News Card Expand/Collapse ---
    const newsCards = document.querySelectorAll('.news-card');
    if (newsCards.length > 0) {
        newsCards.forEach((card) => {
            const cardBody = card.querySelector('.news-card-body');

            // Recalculate scrollable area after the CSS max-height transition ends
            if (cardBody) {
                cardBody.addEventListener('transitionend', (e) => {
                    if (e.propertyName === 'max-height') {
                        maxScrollY = getMaxScrollY();
                        if (setInertialScrollTarget) {
                            setInertialScrollTarget(Math.min(window.scrollY, maxScrollY));
                        }
                    }
                });
            }

            card.addEventListener('click', () => {
                const wasExpanded = card.classList.contains('expanded');

                // Collapse all other cards
                newsCards.forEach((other) => {
                    if (other !== card) {
                        other.classList.remove('expanded');
                    }
                });

                // Toggle clicked card
                card.classList.toggle('expanded');

                // Immediate recalc for a best-effort update
                requestAnimationFrame(() => {
                    maxScrollY = getMaxScrollY();
                    if (setInertialScrollTarget) {
                        setInertialScrollTarget(Math.min(window.scrollY, maxScrollY));
                    }

                    // Scroll to card if expanding
                    if (!wasExpanded) {
                        smoothScrollToElement(card);
                    }
                });
            });
        });
    }

    const majorCards = document.querySelectorAll('.major-card');
    const dynamicBanner = document.getElementById('dynamic-banner');
    const dynamicTitle = document.getElementById('dynamic-title');
    const gridsContainer = document.getElementById('project-grids-container');
    const projectGrids = document.querySelectorAll('.project-grid-section');

    if (majorCards.length === 0 || !dynamicBanner || !dynamicTitle || !gridsContainer) {
        return;
    }

    if (projectGrids.length > 0) {
        projectGrids.forEach((grid) => {
            grid.style.display = 'none';
            grid.hidden = true;
        });
    }

    let currentActiveTarget = null;

    const recalcMaxScrollY = () => {
        maxScrollY = getMaxScrollY();
        if (setInertialScrollTarget) {
            setInertialScrollTarget(Math.min(window.scrollY, maxScrollY));
        }
    };

    majorCards.forEach((card) => {
        card.addEventListener('click', () => {
            const targetId = card.getAttribute('data-target');
            const targetTitle = card.getAttribute('data-title');

            if (!targetId || !targetTitle) {
                return;
            }

            // If clicking the same card that's already open, collapse it
            if (currentActiveTarget === targetId) {
                // Animate out then hide
                dynamicBanner.classList.add('fade-out');
                gridsContainer.classList.add('fade-out');

                const onFadeOut = () => {
                    gridsContainer.removeEventListener('animationend', onFadeOut);
                    dynamicBanner.classList.remove('fade-out');
                    gridsContainer.classList.remove('fade-out');

                    projectGrids.forEach((grid) => {
                        grid.classList.remove('active-grid');
                        grid.style.display = 'none';
                        grid.hidden = true;
                    });

                    dynamicBanner.style.display = 'none';
                    gridsContainer.style.display = 'none';
                    currentActiveTarget = null;

                    requestAnimationFrame(recalcMaxScrollY);
                };

                gridsContainer.addEventListener('animationend', onFadeOut, { once: true });
                return;
            }

            // Otherwise, open the clicked section
            dynamicTitle.textContent = targetTitle;

            // Remove fade-out in case it's lingering
            dynamicBanner.classList.remove('fade-out');
            gridsContainer.classList.remove('fade-out');

            projectGrids.forEach((grid) => {
                grid.classList.remove('active-grid');
                grid.style.display = 'none';
                grid.hidden = true;
            });

            const activeGrid = document.getElementById(targetId);
            if (activeGrid) {
                activeGrid.classList.add('active-grid');
                activeGrid.style.display = 'grid';
                activeGrid.hidden = false;
            }

            dynamicBanner.style.display = 'block';
            gridsContainer.style.display = 'block';
            currentActiveTarget = targetId;

            // Recalculate scrollable area after expanding, then scroll
            requestAnimationFrame(() => {
                recalcMaxScrollY();
                smoothScrollToElement(dynamicBanner);
            });
        });
    });
});
