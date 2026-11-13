/* Decorative motion layer for the homepage. Pairs with assets/css/fx.css. */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function each(list, fn) {
    Array.prototype.forEach.call(list, fn);
  }

  ready(function () {
    var root = document.documentElement;
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var hasObserver = "IntersectionObserver" in window;
    var hero = document.querySelector(".hero-shell");

    /* ---------- Marquee: duplicate groups so the loop is seamless ---------- */
    each(document.querySelectorAll(".marquee-xl__track"), function (track) {
      var group = track.querySelector(".marquee-xl__group");
      if (!group) {
        return;
      }
      track.appendChild(group.cloneNode(true));
      track.appendChild(group.cloneNode(true));
      track.classList.add("is-ready");
    });

    /* ---------- Back-to-top dial with scroll progress ---------- */
    var topButton = document.createElement("button");
    topButton.type = "button";
    topButton.className = "fx-top";
    topButton.setAttribute("aria-label", "Back to top");
    topButton.innerHTML = '<svg viewBox="0 0 52 52" aria-hidden="true"><circle class="fx-top__rail" cx="26" cy="26" r="23"></circle><circle class="fx-top__bar" cx="26" cy="26" r="23"></circle></svg><i class="fas fa-arrow-up" aria-hidden="true"></i>';
    document.body.appendChild(topButton);
    topButton.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });

    /* ---------- Scroll-linked values ---------- */
    var timelines = document.querySelectorAll(".timeline");
    var marqueeTracks = document.querySelectorAll(".marquee-xl__track");
    var lastY = window.scrollY || 0;
    var skew = 0;
    var scrollTicking = false;

    function onScroll() {
      scrollTicking = false;
      var y = window.scrollY || window.pageYOffset;
      var viewport = window.innerHeight;
      var maxScroll = root.scrollHeight - viewport;
      topButton.style.setProperty("--fx-scroll", maxScroll > 0 ? Math.min(1, y / maxScroll).toFixed(4) : "0");
      topButton.classList.toggle("is-on", y > viewport * 0.8);

      each(timelines, function (timeline) {
        var rect = timeline.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > viewport + 200) {
          return;
        }
        var progress = (viewport * 0.72 - rect.top) / Math.max(1, rect.height);
        timeline.style.setProperty("--fx-progress", Math.max(0, Math.min(1, progress)).toFixed(4));
      });

      if (!reduceMotion) {
        var velocity = y - lastY;
        skew = Math.max(-9, Math.min(9, velocity * -0.18));
        each(marqueeTracks, function (track) {
          track.style.setProperty("--fx-skew", skew.toFixed(2) + "deg");
        });
        window.clearTimeout(onScroll.settle);
        onScroll.settle = window.setTimeout(function () {
          each(marqueeTracks, function (track) {
            track.style.setProperty("--fx-skew", "0deg");
          });
        }, 140);
      }
      lastY = y;
    }

    window.addEventListener("scroll", function () {
      if (!scrollTicking) {
        scrollTicking = true;
        window.requestAnimationFrame(onScroll);
      }
    }, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();

    if (reduceMotion) {
      return;
    }

    /* ---------- Headings: split into words that rise when revealed ---------- */
    function splitWords(heading) {
      var index = 0;
      var textNodes = [];
      var walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT, null, false);
      while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
      }
      textNodes.forEach(function (node) {
        var parts = node.nodeValue.split(/(\s+)/);
        var fragment = document.createDocumentFragment();
        parts.forEach(function (part) {
          if (!part) {
            return;
          }
          if (/^\s+$/.test(part)) {
            fragment.appendChild(document.createTextNode(" "));
            return;
          }
          var outer = document.createElement("span");
          var inner = document.createElement("span");
          outer.className = "fx-word";
          inner.textContent = part;
          inner.style.setProperty("--i", String(index));
          index += 1;
          outer.appendChild(inner);
          fragment.appendChild(outer);
        });
        node.parentNode.replaceChild(fragment, node);
      });
    }

    if (hasObserver) {
      each(document.querySelectorAll(".section-head h2, .profile__copy h2, .contact-panel h2"), function (heading) {
        heading.setAttribute("aria-label", heading.textContent.replace(/\s+/g, " ").trim());
        splitWords(heading);
      });
    }

    /* ---------- Section labels: decode effect ---------- */
    var glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>_";

    function decode(node) {
      var finalText = node.nodeValue;
      var frame = 0;
      var total = 22;
      function tick() {
        frame += 1;
        var settled = Math.floor((frame / total) * finalText.length);
        var output = "";
        for (var i = 0; i < finalText.length; i += 1) {
          var ch = finalText.charAt(i);
          output += (i < settled || ch === " ") ? ch : glyphs.charAt(Math.floor(Math.random() * glyphs.length));
        }
        node.nodeValue = output;
        if (frame < total) {
          window.setTimeout(tick, 34);
        } else {
          node.nodeValue = finalText;
        }
      }
      tick();
    }

    if (hasObserver) {
      var labelObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            return;
          }
          labelObserver.unobserve(entry.target);
          var last = entry.target.lastChild;
          if (last && last.nodeType === 3 && last.nodeValue.trim().length) {
            decode(last);
          }
        });
      }, { rootMargin: "0px 0px -10% 0px", threshold: 0 });
      each(document.querySelectorAll(".section-kicker"), function (label) {
        label.setAttribute("aria-label", label.textContent.replace(/\s+/g, " ").trim());
        labelObserver.observe(label);
      });
    }

    /* ---------- Hero: particle network that reacts to the pointer ---------- */
    if (hero && hero.getContext === undefined) {
      var canvas = document.createElement("canvas");
      canvas.className = "hero-shell__particles";
      canvas.setAttribute("aria-hidden", "true");
      var glow = hero.querySelector(".hero-shell__glow");
      hero.insertBefore(canvas, glow ? glow.nextSibling : hero.firstChild);
      var ctx = canvas.getContext("2d");
      var particles = [];
      var width = 0;
      var height = 0;
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      var pointer = { x: -9999, y: -9999 };
      var heroVisible = true;
      var running = false;

      var resizeCanvas = function () {
        var rect = hero.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var count = Math.max(26, Math.min(90, Math.round((width * height) / 17000)));
        particles = [];
        for (var i = 0; i < count; i += 1) {
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.32,
            vy: (Math.random() - 0.5) * 0.32,
            r: Math.random() * 1.4 + 0.6,
            warm: Math.random() < 0.28
          });
        }
      };

      var draw = function () {
        if (!heroVisible || hero.classList.contains("is-motion-paused") || document.hidden) {
          running = false;
          return;
        }
        ctx.clearRect(0, 0, width, height);
        var linkDistance = width < 700 ? 96 : 138;
        for (var i = 0; i < particles.length; i += 1) {
          var p = particles[i];
          var dxp = p.x - pointer.x;
          var dyp = p.y - pointer.y;
          var distPointer = Math.sqrt(dxp * dxp + dyp * dyp);
          if (distPointer < 150 && distPointer > 0.01) {
            var push = (150 - distPointer) / 150 * 0.5;
            p.x += (dxp / distPointer) * push;
            p.y += (dyp / distPointer) * push;
          }
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -20) { p.x = width + 20; }
          if (p.x > width + 20) { p.x = -20; }
          if (p.y < -20) { p.y = height + 20; }
          if (p.y > height + 20) { p.y = -20; }

          for (var j = i + 1; j < particles.length; j += 1) {
            var q = particles[j];
            var dx = p.x - q.x;
            var dy = p.y - q.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < linkDistance) {
              var alpha = (1 - dist / linkDistance) * 0.26;
              ctx.strokeStyle = (p.warm || q.warm) ? "rgba(255,173,97," + alpha.toFixed(3) + ")" : "rgba(150,205,255," + alpha.toFixed(3) + ")";
              ctx.lineWidth = 0.7;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(q.x, q.y);
              ctx.stroke();
            }
          }

          if (distPointer < 190) {
            ctx.strokeStyle = "rgba(255,173,97," + ((1 - distPointer / 190) * 0.5).toFixed(3) + ")";
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.stroke();
          }

          ctx.fillStyle = p.warm ? "rgba(255,173,97,0.9)" : "rgba(200,228,255,0.75)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        window.requestAnimationFrame(draw);
      };

      var start = function () {
        if (!running) {
          running = true;
          window.requestAnimationFrame(draw);
        }
      };

      resizeCanvas();
      canvas.classList.add("is-on");
      start();

      var resizeTimer = null;
      window.addEventListener("resize", function () {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(resizeCanvas, 180);
      });
      hero.addEventListener("pointermove", function (event) {
        var rect = hero.getBoundingClientRect();
        pointer.x = event.clientX - rect.left;
        pointer.y = event.clientY - rect.top;
      });
      hero.addEventListener("pointerleave", function () {
        pointer.x = -9999;
        pointer.y = -9999;
      });
      document.addEventListener("visibilitychange", start);
      var toggle = hero.querySelector(".hero-motion-toggle");
      if (toggle) {
        toggle.addEventListener("click", function () {
          window.setTimeout(start, 0);
        });
      }
      if (hasObserver) {
        new IntersectionObserver(function (entries) {
          heroVisible = entries[0].isIntersecting;
          if (heroVisible) {
            start();
          }
        }, { threshold: 0 }).observe(hero);
      }
    }

    if (!finePointer) {
      return;
    }

    /* ---------- Cursor aura + click sparks ---------- */
    var ring = document.createElement("div");
    ring.className = "fx-cursor";
    ring.setAttribute("aria-hidden", "true");
    document.body.appendChild(ring);
    var target = { x: 0, y: 0 };
    var current = { x: 0, y: 0 };
    var ringActive = false;

    function followCursor() {
      current.x += (target.x - current.x) * 0.2;
      current.y += (target.y - current.y) * 0.2;
      ring.style.transform = "translate3d(" + current.x.toFixed(1) + "px," + current.y.toFixed(1) + "px,0)";
      if (Math.abs(target.x - current.x) > 0.1 || Math.abs(target.y - current.y) > 0.1) {
        window.requestAnimationFrame(followCursor);
      } else {
        ringActive = false;
      }
    }

    document.addEventListener("pointermove", function (event) {
      if (event.pointerType && event.pointerType !== "mouse") {
        return;
      }
      target.x = event.clientX;
      target.y = event.clientY;
      if (!ring.classList.contains("is-on")) {
        current.x = target.x;
        current.y = target.y;
        ring.classList.add("is-on");
      }
      var interactive = event.target.closest ? event.target.closest("a, button, .course-card, .feature-card, .publication-row") : null;
      ring.classList.toggle("is-link", !!interactive);
      if (!ringActive) {
        ringActive = true;
        window.requestAnimationFrame(followCursor);
      }
    }, { passive: true });

    document.documentElement.addEventListener("pointerleave", function () {
      ring.classList.remove("is-on");
    });

    document.addEventListener("pointerdown", function (event) {
      if (event.pointerType && event.pointerType !== "mouse") {
        return;
      }
      ring.classList.add("is-down");
      if (!ring.animate) {
        return;
      }
      for (var i = 0; i < 9; i += 1) {
        (function (index) {
          var spark = document.createElement("span");
          var angle = (Math.PI * 2 * index) / 9 + Math.random() * 0.5;
          var distance = 34 + Math.random() * 38;
          spark.className = "fx-spark";
          spark.style.left = event.clientX + "px";
          spark.style.top = event.clientY + "px";
          if (index % 3 === 0) {
            spark.style.background = "#ffad61";
          }
          document.body.appendChild(spark);
          spark.animate([
            { transform: "translate(0,0) scale(1)", opacity: 1 },
            { transform: "translate(" + (Math.cos(angle) * distance).toFixed(1) + "px," + (Math.sin(angle) * distance).toFixed(1) + "px) scale(0)", opacity: 0 }
          ], { duration: 520 + Math.random() * 260, easing: "cubic-bezier(0.2,0.8,0.2,1)" }).onfinish = function () {
            if (spark.parentNode) {
              spark.parentNode.removeChild(spark);
            }
          };
        })(i);
      }
    });

    document.addEventListener("pointerup", function () {
      ring.classList.remove("is-down");
    });

    /* ---------- Magnetic buttons ---------- */
    each(document.querySelectorAll(".btn, .network-links a, .hero-motion-toggle, .fx-top"), function (element) {
      element.addEventListener("pointermove", function (event) {
        var rect = element.getBoundingClientRect();
        var dx = event.clientX - (rect.left + rect.width / 2);
        var dy = event.clientY - (rect.top + rect.height / 2);
        element.style.transform = "translate(" + (dx * 0.28).toFixed(1) + "px," + (dy * 0.36).toFixed(1) + "px)";
      });
      element.addEventListener("pointerleave", function () {
        element.style.transform = "";
      });
    });

    /* ---------- Pointer tilt for the portrait and publication covers ---------- */
    each(document.querySelectorAll(".profile-portrait__frame, .publication-row__image"), function (element) {
      var host = element.closest(".publication-row") || element;
      element.classList.add("fx-tilt");
      host.addEventListener("pointermove", function (event) {
        var rect = element.getBoundingClientRect();
        var px = Math.max(-0.5, Math.min(0.5, (event.clientX - rect.left) / rect.width - 0.5));
        var py = Math.max(-0.5, Math.min(0.5, (event.clientY - rect.top) / rect.height - 0.5));
        element.style.setProperty("--fx-rx", (py * -10).toFixed(2) + "deg");
        element.style.setProperty("--fx-ry", (px * 12).toFixed(2) + "deg");
      });
      host.addEventListener("pointerleave", function () {
        element.style.setProperty("--fx-rx", "0deg");
        element.style.setProperty("--fx-ry", "0deg");
      });
    });
  });
})();
