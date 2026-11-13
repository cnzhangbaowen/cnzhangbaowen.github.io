/* Homepage interactions: hero reel, navigation state, scroll reveals, and small motion details. */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  ready(function () {
    var root = document.documentElement;
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var masthead = document.querySelector(".masthead");
    var hero = document.querySelector(".hero-shell");
    var navLinks = Array.prototype.slice.call(document.querySelectorAll('.greedy-nav a[href*="#"]'));

    /* ---------- Scroll progress + masthead state ---------- */
    var progressBar = document.createElement("div");
    progressBar.id = "scroll-progress";
    document.body.appendChild(progressBar);

    var heroMedia = hero ? hero.querySelector(".hero-shell__media") : null;
    var ticking = false;

    function onScroll() {
      ticking = false;
      var y = window.scrollY || window.pageYOffset;
      var maxScroll = root.scrollHeight - window.innerHeight;
      progressBar.style.transform = "scaleX(" + (maxScroll > 0 ? Math.min(1, y / maxScroll) : 0) + ")";
      if (masthead) {
        masthead.classList.toggle("is-scrolled", y > 24);
      }
      if (heroMedia && !reduceMotion && y < window.innerHeight * 1.2) {
        heroMedia.style.transform = "translate3d(0," + (y * 0.18).toFixed(1) + "px,0)";
      }
    }

    function requestScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(onScroll);
      }
    }

    window.addEventListener("scroll", requestScroll, { passive: true });
    window.addEventListener("resize", requestScroll);
    onScroll();

    /* ---------- In-page anchors: native smooth scroll that respects the fixed header ---------- */
    Array.prototype.forEach.call(document.querySelectorAll('a[href*="#"]'), function (link) {
      var url;
      try {
        url = new URL(link.href, window.location.href);
      } catch (error) {
        return;
      }
      if (url.pathname === window.location.pathname && url.hash.length > 1) {
        link.setAttribute("target", "_self");
        link.setAttribute("data-inpage", "true");
      }
    });

    document.addEventListener("click", function (event) {
      var link = event.target.closest ? event.target.closest('a[data-inpage="true"]') : null;
      if (!link) {
        return;
      }
      var target = document.querySelector(new URL(link.href).hash);
      if (!target) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, "", new URL(link.href).hash);
      }
      Array.prototype.forEach.call(document.querySelectorAll(".is-targeted"), function (el) {
        el.classList.remove("is-targeted");
      });
      if (target.classList.contains("course-card")) {
        target.classList.add("is-targeted");
      }
      var hiddenLinks = document.querySelector("#site-nav .hidden-links");
      var navButton = document.querySelector("#site-nav button");
      if (hiddenLinks && link.closest(".hidden-links")) {
        hiddenLinks.classList.add("hidden");
        if (navButton) {
          navButton.classList.remove("close");
        }
      }
    }, true);

    /* ---------- Hero background reel (campus video clips over still frames) ---------- */
    var motionToggle = document.querySelector(".hero-motion-toggle");
    var heroPlayer = null;
    var activeHeroClip = 0;
    var heroClipTimer = null;
    var heroClips = [
      { videoId: "rm1mEx0B_Ro", startSeconds: 4, endSeconds: 14 },
      { videoId: "42sH6JL4Ns8", startSeconds: 5, endSeconds: 14 }
    ];

    function scheduleNextHeroClip(fromCurrentTime) {
      window.clearTimeout(heroClipTimer);
      var clip = heroClips[activeHeroClip];
      var currentTime = fromCurrentTime ? heroPlayer.getCurrentTime() : clip.startSeconds;
      var remaining = Math.max(0.5, clip.endSeconds - currentTime - 0.35);
      heroClipTimer = window.setTimeout(function () {
        if (!hero.classList.contains("is-motion-paused")) {
          playHeroClip(activeHeroClip + 1);
        }
      }, remaining * 1000);
    }

    function playHeroClip(index) {
      activeHeroClip = index % heroClips.length;
      hero.classList.remove("is-video-ready");
      hero.setAttribute("data-active-campus", activeHeroClip === 0 ? "syracuse" : "csu-pueblo");
      heroPlayer.loadVideoById(heroClips[activeHeroClip]);
      heroPlayer.mute();
      scheduleNextHeroClip(false);
    }

    if (hero && !reduceMotion) {
      window.onYouTubeIframeAPIReady = function () {
        heroPlayer = new YT.Player("hero-youtube-player", {
          videoId: heroClips[0].videoId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            enablejsapi: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            start: heroClips[0].startSeconds,
            end: heroClips[0].endSeconds
          },
          events: {
            onReady: function (event) {
              event.target.mute();
              var iframe = event.target.getIframe();
              iframe.setAttribute("tabindex", "-1");
              iframe.setAttribute("title", "Campus aerial background video");
              playHeroClip(0);
            },
            onStateChange: function (event) {
              if (event.data === YT.PlayerState.PLAYING) {
                hero.classList.add("is-video-ready");
              }
            }
          }
        });
      };

      var youtubeApi = document.createElement("script");
      youtubeApi.src = "https://www.youtube.com/iframe_api";
      youtubeApi.async = true;
      document.head.appendChild(youtubeApi);
    }

    if (hero && motionToggle) {
      motionToggle.addEventListener("click", function () {
        var paused = hero.classList.toggle("is-motion-paused");
        if (heroPlayer && heroPlayer.pauseVideo) {
          if (paused) {
            window.clearTimeout(heroClipTimer);
            heroPlayer.pauseVideo();
          } else {
            heroPlayer.playVideo();
            scheduleNextHeroClip(true);
          }
        }
        motionToggle.setAttribute("aria-pressed", String(paused));
        motionToggle.setAttribute("aria-label", paused ? "Play background motion" : "Pause background motion");
        motionToggle.querySelector("i").className = paused ? "fas fa-play" : "fas fa-pause";
      });
    }

    /* ---------- Hero: cursor-following light ---------- */
    if (hero && finePointer && !reduceMotion) {
      hero.addEventListener("pointermove", function (event) {
        var rect = hero.getBoundingClientRect();
        hero.style.setProperty("--mx", (event.clientX - rect.left) + "px");
        hero.style.setProperty("--my", (event.clientY - rect.top) + "px");
      });
    }

    /* ---------- Ticker: duplicate the group for a seamless loop ---------- */
    Array.prototype.forEach.call(document.querySelectorAll(".ticker__track"), function (track) {
      var group = track.querySelector(".ticker__group");
      if (group) {
        track.appendChild(group.cloneNode(true));
        track.classList.add("is-ready");
      }
    });

    /* ---------- Google Scholar metrics: count up when the numbers arrive ---------- */
    function countUp(element, target) {
      if (reduceMotion || target <= 0) {
        return;
      }
      var start = null;
      var duration = 1100;
      element.setAttribute("data-counting", "true");
      function step(timestamp) {
        if (start === null) {
          start = timestamp;
        }
        var progress = Math.min(1, (timestamp - start) / duration);
        var eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = String(Math.round(target * eased));
        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          element.textContent = String(target);
          element.removeAttribute("data-counting");
        }
      }
      window.requestAnimationFrame(step);
    }

    if ("MutationObserver" in window) {
      Array.prototype.forEach.call(document.querySelectorAll(".metric-card__value"), function (element) {
        var done = false;
        var metricObserver = new MutationObserver(function () {
          if (done || element.getAttribute("data-counting")) {
            return;
          }
          var value = parseInt(element.textContent, 10);
          if (!isNaN(value)) {
            done = true;
            metricObserver.disconnect();
            countUp(element, value);
          }
        });
        metricObserver.observe(element, { childList: true, characterData: true, subtree: true });
      });
    }

    /* ---------- Cards: pointer-tracked highlight and gentle tilt ---------- */
    var glowSelector = ".feature-card, .capability-card, .publication-row, .editorial-note, .metrics-panel, .course-card, .testimonial-card, .contact-panel, .project-item";
    if (finePointer) {
      Array.prototype.forEach.call(document.querySelectorAll(glowSelector), function (element) {
        element.addEventListener("pointermove", function (event) {
          var rect = element.getBoundingClientRect();
          element.style.setProperty("--pointer-x", (event.clientX - rect.left) + "px");
          element.style.setProperty("--pointer-y", (event.clientY - rect.top) + "px");
        });
      });

      if (!reduceMotion) {
        Array.prototype.forEach.call(document.querySelectorAll(".feature-card--visual"), function (card) {
          card.addEventListener("pointermove", function (event) {
            var rect = card.getBoundingClientRect();
            var px = (event.clientX - rect.left) / rect.width - 0.5;
            var py = (event.clientY - rect.top) / rect.height - 0.5;
            card.style.setProperty("--tilt-x", (py * -5).toFixed(2) + "deg");
            card.style.setProperty("--tilt-y", (px * 6).toFixed(2) + "deg");
          });
          card.addEventListener("pointerleave", function () {
            card.style.setProperty("--tilt-x", "0deg");
            card.style.setProperty("--tilt-y", "0deg");
          });
        });
      }
    }

    if (!("IntersectionObserver" in window)) {
      root.classList.add("no-observer");
      return;
    }

    /* ---------- Active section in the navigation ---------- */
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) {
          return;
        }
        navLinks.forEach(function (link) {
          link.classList.toggle("is-active", new URL(link.href).hash === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "-35% 0px -55%", threshold: 0 });

    navLinks.forEach(function (link) {
      var hash = new URL(link.href).hash;
      var section = hash.length > 1 ? document.querySelector(hash) : null;
      if (section) {
        sectionObserver.observe(section);
      }
    });

    if (hero) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            navLinks.forEach(function (link) {
              link.classList.remove("is-active");
            });
          }
        });
      }, { rootMargin: "-35% 0px -55%", threshold: 0 }).observe(hero);
    }

    /* ---------- Scroll reveals: each element animates as it enters the viewport ---------- */
    var revealSelector = [
      ".section-head", ".profile__copy", ".profile-portrait", ".editorial-note", ".metrics-panel",
      ".timeline__item", ".feature-card", ".project-item", ".methods-visual", ".capability-card",
      ".course-finder", ".course-group-heading", ".course-card", ".testimonial-card",
      ".publication-row", ".contact-panel", ".site-footer"
    ].join(", ");

    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0 });

    var siblingCounts = [];
    Array.prototype.forEach.call(document.querySelectorAll(revealSelector), function (element) {
      var parent = element.parentNode;
      var record = null;
      for (var i = 0; i < siblingCounts.length; i += 1) {
        if (siblingCounts[i].parent === parent) {
          record = siblingCounts[i];
          break;
        }
      }
      if (!record) {
        record = { parent: parent, count: 0 };
        siblingCounts.push(record);
      }
      element.style.setProperty("--reveal-delay", ((record.count % 4) * 90) + "ms");
      record.count += 1;
      element.classList.add("reveal");
      revealObserver.observe(element);
    });
  });
})();
