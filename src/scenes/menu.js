class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  preload() {
    // load every character skin; texture keys are skin-<id>-idle / -fly / -hit.
    // After repeated stalled attempts (see watchdog below), stop insisting:
    // queue nothing so 'complete' fires immediately and the menu builds with
    // whatever arrived on earlier tries plus procedural fallbacks — a rough
    // boot always beats an infinite loading screen.
    if ((window._menuLoadRetries || 0) < 6) {
      Object.entries(CATALOG.SKINS).forEach(([id, s]) => {
        this.load.image(`skin-${id}-idle`, `assets/skins/${s.dir}/idle.png`);
        this.load.image(`skin-${id}-fly`, `assets/skins/${s.dir}/fly.png`);
        if (s.hit) this.load.image(`skin-${id}-hit`, `assets/skins/${s.dir}/hit.png`);
      });
    }
    this.load.on('loaderror', () => {}); // missing art -> procedural fallback

    // The loader dispatches queued downloads from the game's update loop, so a
    // throttled/paused RAF during boot (common on phones) can wedge it — and
    // individual connections can also hang mid-download with no error event.
    // Watchdog on a plain interval (independent of the game loop): whatever
    // the stall shape, if no file completes for ~3 ticks, restart the scene.
    // Textures that already arrived are kept, so each retry only fetches
    // what's still missing.
    let lastDone = -1, stalled = 0;
    const stall = setInterval(() => {
      const ld = this.load;
      if (!ld || !ld.isLoading()) { clearInterval(stall); return; }
      if (ld.totalComplete !== lastDone) { lastDone = ld.totalComplete; stalled = 0; return; }
      stalled++;
      if (window.game && window.game.loop && window.game.loop.wake) window.game.loop.wake();
      // queued-but-never-dispatched shape: pumping is cheaper than restarting
      if (ld.inflight.size === 0 && ld.list.size > 0 && ld.checkLoadQueue) ld.checkLoadQueue();
      if (stalled >= 3) {
        clearInterval(stall);
        window._menuLoadRetries = (window._menuLoadRetries || 0) + 1;
        this.scene.restart();
      }
    }, 3000);
    this.load.once('complete', () => clearInterval(stall));
  }

  create() {
    buildTextures(this);
    const save = window.SAVE.data;
    buildMapTextures(this, save.map);
    buildShipTextures(this, save.ship);
    buildFaceTextures(this); // circular profile-picture avatars
    window.VOICE.init(this);
    window.SFX.initFiles(this); // optional assets/sfx/*.mp3 replacements

    // resolve the equipped skin's textures; fall back to the default trump skin
    // if the saved id is unknown (e.g. removed from the catalog)
    const id = this.textures.exists(`skin-${save.skin}-idle`) ? save.skin : 'trump';
    window.SKIN = {
      idle: `skin-${id}-idle`,
      fly: this.textures.exists(`skin-${id}-fly`) ? `skin-${id}-fly` : `skin-${id}-idle`,
      hit: this.textures.exists(`skin-${id}-hit`) ? `skin-${id}-hit` : null,
    };
    const SS = window.SS, TS = window.TEX_SCALE;
    window.setupCamera(this);
    const W = this.scale.width / SS, H = this.scale.height / SS;
    // sky, clouds, mountains and water — shared with the shop and leaderboard
    this.clouds = drawBackdrop(this, save.map);

    // tanker sailing through the strait
    // sails along the middle of the water band, wherever that band sits
    const tanker = this.add.image(-100, seaBand(H).seaTop + 70, 'tanker-' + save.ship).setScale(TS);
    this.tweens.add({
      targets: tanker, x: W + 120, duration: 24000, repeat: -1,
      onRepeat: () => { tanker.x = -100; },
    });

    // Header readouts. Coins, Trump Bucks, best score and the account chip all
    // share one recipe — the PLAY button's rounded rectangle, flat filled, with
    // a gold rim — so the row reads as a set. Refs are kept so login/sign-out
    // can update them live.
    const T = window.THEME;
    const M = 16;

    // Currency readouts, sized to whatever they hold — a box built for "16278"
    // looks broken around "46". Coins take the reward gold; Trump Bucks take
    // tertiary, so the two never read as the same currency at a glance.
    this.coinPill = this.makeStatPill(M, 12, 'coin', 0.66, `${save.bank}`, '#ffd795', 34, 19);
    this.bankText = this.coinPill.text;
    this.billPill = this.makeStatPill(M, 52, 'bill', 0.48, `${save.bills || 0}`, '#9ecfd1', 34, 19);
    this.billsText = this.billPill.text;

    // BEST is right-anchored so it grows leftward as the score gets longer and
    // never collides with the account chip beside it.
    this.bestG = this.add.graphics();
    this.bestText = this.add.text(0, 29, `BEST ${save.best}`, {
      fontFamily: window.FONT_LABEL, fontSize: '12px', color: '#ffd795',
    }).setOrigin(1, 0.5).setDepth(1);
    this.layoutBest = () => {
      // ends 8 units left of the avatar (which is 34 wide, inset 12 from the
      // edge) — derived rather than guessed, so the two stay paired
      const right = W - 12 - 34 - 8;
      const w = this.bestText.width + 20;
      this.bestText.x = right - 12;
      this.bestG.clear();
      uiPanel(this, right - w, 12, w, 34, {
        g: this.bestG, color: T.surfaceHighest, radius: 12,
        borderWidth: 2, strokeColor: T.secondary,
      });
    };
    this.layoutBest();

    // welcome greeting above the title (updates on login / sign-out / name change)
    // It sits over drifting clouds, so it takes the same navy outline and hard
    // shadow the title wears — that is how everything in this system stays
    // readable against whatever the sky is doing behind it.
    this.welcomeText = this.add.text(W / 2, 104, '', {
      fontFamily: window.FONT_LABEL, fontSize: '14px', color: '#ffd795',
      stroke: '#1d3557', strokeThickness: 5,
    }).setOrigin(0.5);
    this.welcomeText.setShadow(0, 3, '#1d3557', 0, false, true);
    this.refreshWelcome();

    // Title: Anybody 900, uppercase, a 2px navy stroke and a hard unblurred
    // navy shadow directly below it. That shadow is the signature of the system.
    const title = this.add.text(W / 2, 158, 'TRUMP JUMP', {
      fontFamily: FONT, fontSize: '60px', color: '#fbb400',
      stroke: '#1d3557', strokeThickness: 8,
    }).setOrigin(0.5);
    title.setShadow(0, 7, '#1d3557', 0, false, true);
    const sub = this.add.text(W / 2, 210, 'STRAIT OF HORMUZ', {
      fontFamily: FONT, fontStyle: '800', fontSize: '26px', color: '#ffd795',
      stroke: '#1d3557', strokeThickness: 5,
    }).setOrigin(0.5);
    sub.setShadow(0, 3, '#1d3557', 0, false, true);

    // bouncing trump on a warm glow — the comp's powerup-glow radial, scaled up
    // Everything below here is anchored to the bottom edge, so the extra height
    // on a tall phone opens up around the character rather than leaving a gap
    // under the buttons. Declared here because the character sits between the
    // subtitle and the chip row and needs to know where that row lands.
    // These are the original game's positions (PLAY at 556, chips at 452,
    // character at 332 in an 800-tall world) expressed as offsets from the
    // bottom, so a taller phone opens space around the character instead of
    // under the buttons. The character is centred in whatever gap results.
    const playY = H - 214;
    const chipY = playY - 104, chip = 52;
    const charY = Math.round((210 + chipY - chip / 2) / 2);
    // He grows into the gap between the subtitle and the chips rather than
    // floating in it — 150 tall is the original, against the 216 units of room
    // an 800-tall world leaves him.
    const room = chipY - chip / 2 - 210;
    const charH = 150 * Phaser.Math.Clamp(room / 216, 0.82, 1.5);
    const glow = this.add.image(W / 2, charY + 10, 'sun')
      .setScale(0.95 * TS * (charH / 150)).setAlpha(0.42);
    const srcH = this.textures.get(window.SKIN.idle).getSourceImage().height;
    this.char = this.add.image(W / 2, charY, window.SKIN.idle).setScale(charH / srcH);
    this.tweens.add({
      targets: this.char, y: charY - 10, duration: 1800,
      yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    this.tweens.add({
      targets: glow, alpha: 0.28, duration: 1800, yoyo: true, repeat: -1,
      ease: 'Sine.inOut',
    });

    // left/right arrows to switch the equipped skin right from the menu
    // (only among owned skins; hidden when the player owns just one)
    this.skinArrows = [
      this.makeSkinArrow(W / 2 - Math.max(120, charH * 0.86), charY + 4, -1),
      this.makeSkinArrow(W / 2 + Math.max(120, charH * 0.86), charY + 4, 1),
    ];
    this.refreshSkinArrows();

    // touch: swipe left/right across the character area to flip skins on phone
    let downX = 0, downY = 0;
    this.input.on('pointerdown', (p) => { downX = p.x; downY = p.y; });
    const onUp = (p) => {
      const SS = window.SS;
      this.onSwipe((p.x - downX) / SS, (p.y - downY) / SS, downY / SS);
    };
    this.input.on('pointerup', onUp);
    this.input.on('pointerupoutside', onUp);

    // Powerup legend. No containers: five navy boxes punched five dark holes in
    // a warm sky and fought the buttons below for attention. The icons are
    // already distinct shapes in distinct colours, so they carry themselves —
    // each just gets the system's hard navy shadow (the same sprite, tinted and
    // offset) to lift it off whatever the sky is doing behind it.
    const skinDef = CATALOG.SKINS[save.skin] || {};
    const capIcon = (skinDef.cap && this.textures.exists(skinDef.cap)) ? skinDef.cap : 'cap';
    const legend = [
      [capIcon, 'JET'], ['spring', 'BOUNCE'], ['shield', 'DOME'],
      ['magnet', 'MAGNET'], ['coin', 'CASH'],
    ];
    legend.forEach(([key, label], i) => {
      const x = W / 2 + (i - 2) * 84;
      const shadow = this.add.image(x, chipY + 4, key)
        .setScale(1.15 * TS).setTint(T.outline).setAlpha(0.9);
      const icon = this.add.image(x, chipY, key).setScale(1.15 * TS);
      if (label === 'JET') {
        this.jetIcon = icon;          // both update when the skin changes
        this.jetShadow = shadow;
      }
      // the background sun sits right behind this row, so the labels carry the
      // system's hard navy shadow to stay legible over the bright middle
      this.add.text(x, chipY + chip / 2 + 13, label, {
        fontFamily: window.FONT_LABEL, fontSize: '12px', color: '#ffd795',
      }).setOrigin(0.5).setShadow(0, 2, '#1d3557', 0, false, true);
    });

    // Buttons run the full content width and sit bottom-heavy, in thumb reach.
    // PLAY is deliberately the biggest thing on the screen.
    // Sized down from the comp: at full width and height the stack crowded the
    // chips above it. The three narrow as they descend in importance, which
    // also gives the eye a clear order.
    const bw = 280;
    uiButton(this, W / 2, playY, bw, 62, 'PLAY', () => this.go(), { size: 32, radius: 15 });
    uiButton(this, W / 2, H - 148, bw - 60, 48, 'SHOP', () => {
      window.SFX.init();
      this.scene.start('Shop');
    }, { color: T.secondary, size: 22, radius: 14 });
    uiButton(this, W / 2, H - 88, bw - 92, 46, 'LEADERBOARD', () => {
      window.SFX.init();
      this.scene.start('Leaderboard');
    }, { color: T.surfaceHighest, size: 18, radius: 14 });

    this.add.text(W / 2, H - 38, 'arrows / A D / touch • P: pause', {
      fontFamily: window.FONT_LABEL, fontSize: '13px', color: '#e4bebc',
    }).setOrigin(0.5).setAlpha(0.7);

    // settings gear (bottom-left) — enter friend codes to unlock secret skins
    const gear = this.add.container(40, H - 38).setDepth(6);
    gear.add(this.add.circle(0, 3, 23, T.outline));   // the hard edge it sits on
    const gearBg = this.add.circle(0, 0, 23, T.surfaceHigh)
      .setStrokeStyle(4, T.outlineVariant, 1)
      .setInteractive({ useHandCursor: true });
    gear.add(gearBg);
    gear.add(this.add.text(0, 1, '⚙', { fontSize: '21px' }).setOrigin(0.5));
    gearBg.on('pointerover', () => gear.setScale(1.1));
    gearBg.on('pointerout', () => gear.setScale(1));
    gearBg.on('pointerup', () => {
      if (window.SFX && window.SFX.click) window.SFX.click();
      if (window.settingsModal) window.settingsModal();
    });

    // daily bonus (bottom-right), mirroring the settings gear. The red dot —
    // and the nudge tween behind it — mean there is a bonus waiting to claim.
    const daily = this.add.container(W - 40, H - 38).setDepth(6);
    daily.add(this.add.circle(0, 3, 23, T.outline));  // the hard edge it sits on
    const dailyBg = this.add.circle(0, 0, 23, T.surfaceHigh)
      .setStrokeStyle(4, T.outlineVariant, 1)
      .setInteractive({ useHandCursor: true });
    daily.add(dailyBg);
    daily.add(this.add.text(0, 1, '🎁', { fontSize: '20px' }).setOrigin(0.5));
    this.dailyDot = this.add.circle(16, -16, 6, T.primaryLight)
      .setStrokeStyle(3, T.outline, 1)
      .setVisible(false);
    daily.add(this.dailyDot);
    this.dailyPulse = this.tweens.add({
      targets: daily, scale: 1.12, duration: 900,
      yoyo: true, repeat: -1, ease: 'Sine.inOut', paused: true,
    });
    dailyBg.on('pointerover', () => daily.setScale(1.1));
    dailyBg.on('pointerout', () => daily.setScale(1));
    dailyBg.on('pointerup', () => {
      if (window.SFX && window.SFX.click) window.SFX.click();
      if (window.DAILY) window.DAILY.open();
    });
    this.dailyBtn = daily;
    this.refreshDaily();

    // account chip (top center) + live auth updates. Track the current user so
    // a sign-in/out (identity change) rebuilds the whole menu — character,
    // fleet, map and pills all reflect the newly loaded / reset save.
    // Before Firebase resolves the restored session (1-2s after open), trust
    // the persisted auth hint so the returning user doesn't flash "guest" and
    // the confirming auth event doesn't force a visible scene restart.
    const hint = this.authHint();
    this._lastUid = (window.FB && window.FB.user) ? window.FB.user.uid
      : (hint ? hint.uid : null);
    this.updateAccountChip();
    this._authHandler = () => this.onAuth();
    document.addEventListener('fb-auth', this._authHandler);
    this._pfpHandler = () => this.updateAccountChip();
    document.addEventListener('pfp-change', this._pfpHandler);
    this.events.once('shutdown', () => {
      document.removeEventListener('fb-auth', this._authHandler);
      document.removeEventListener('pfp-change', this._pfpHandler);
    });
    this.onAuth();

    // first-ever visit: offer sign in vs play as guest
    if (!localStorage.getItem('tj-intro') && (!window.FB || !window.FB.user)) {
      localStorage.setItem('tj-intro', '1');
      this.time.delayedCall(500, () => {
        if (window.accountModal && (!window.FB || !window.FB.user)) window.accountModal();
      });
    }

    // SPACE starts the game — but not while typing in a modal input (e.g.
    // entering a name/code), where space is a normal character
    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.typingInModal()) return;
      this.go();
    });

    // left/right also flip through owned skins on the menu
    this.input.keyboard.on('keydown-LEFT', () => {
      if (!this.typingInModal()) this.cycleSkin(-1);
    });
    this.input.keyboard.on('keydown-RIGHT', () => {
      if (!this.typingInModal()) this.cycleSkin(1);
    });

    // menu is fully built — drop the HTML boot splash
    if (window.hideSplash) window.hideSplash();
  }

  // last-known signed-in identity ({uid, username}) persisted by firebase.js —
  // only trusted while Firebase hasn't resolved the restored session yet
  authHint() {
    if (window.FB && window.FB.authResolved) return null;
    try { return JSON.parse(localStorage.getItem('tj-auth-hint') || 'null'); }
    catch (e) { return null; }
  }

  typingInModal() {
    const ae = document.activeElement;
    return !!(ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA'));
  }

  // owned skins in catalog order
  ownedSkins() {
    const save = window.SAVE.data;
    return Object.keys(CATALOG.SKINS).filter(k => save.skins.includes(k));
  }

  // gold chevron button flanking the character (dir -1 = left, +1 = right)
  makeSkinArrow(x, y, dir) {
    const cont = this.add.container(x, y).setDepth(6);

    const T = window.THEME;
    // soft gold halo behind the disc
    const glow = this.add.circle(0, 0, 26, T.secondary, 0.18);
    cont.add(glow);
    cont.add(this.add.circle(0, 3, 22, T.outline));   // the hard edge it sits on

    // navy disc with a gold rim
    const bg = this.add.circle(0, 0, 22, T.surfaceHighest, 1)
      .setStrokeStyle(4, T.secondary, 1)
      .setInteractive({ useHandCursor: true });
    cont.add(bg);

    // crisp double-stroke chevron pointing outward
    const s = dir < 0 ? -1 : 1;
    const draw = (g, color, w) => {
      g.lineStyle(w, color, 1);
      g.beginPath();
      g.moveTo(s * -6, -11);
      g.lineTo(s * 7, 0);
      g.lineTo(s * -6, 11);
      g.strokePath();
    };
    const chevron = this.add.graphics();
    draw(chevron, T.outline, 7);      // navy underlay, same outline as everything
    draw(chevron, 0xffd795, 4);       // bright gold chevron
    cont.add(chevron);

    // gentle idle: halo breathes and the button nudges outward, hinting "tap me"
    const idle = [
      this.tweens.add({
        targets: glow, alpha: 0.32, scale: 1.18, duration: 1100,
        yoyo: true, repeat: -1, ease: 'Sine.inOut',
      }),
      this.tweens.add({
        targets: cont, x: x + s * 4, duration: 1100,
        yoyo: true, repeat: -1, ease: 'Sine.inOut',
      }),
    ];

    bg.on('pointerover', () => { bg.setFillStyle(T.surfaceHigh, 1); cont.setScale(1.12); });
    bg.on('pointerout', () => { bg.setFillStyle(T.surfaceHighest, 1); cont.setScale(1); });
    bg.on('pointerdown', () => cont.setScale(0.9));
    bg.on('pointerup', () => {
      cont.setScale(1.12);
      this.cycleSkin(dir);
    });

    // shown = live gold button; hidden = gone entirely (input + idle paused)
    cont.setShown = (on) => {
      cont.setVisible(on);
      if (on) {
        bg.setInteractive({ useHandCursor: true });
        idle.forEach(t => t.resume());
      } else {
        bg.disableInteractive();
        idle.forEach(t => t.pause());
        cont.x = x;          // undo any mid-tween nudge
        cont.setScale(1);
      }
    };
    return cont;
  }

  // arrows only appear when there is more than one owned skin to cycle through
  refreshSkinArrows() {
    if (!this.skinArrows) return;
    const canSwitch = this.ownedSkins().length > 1;
    this.skinArrows.forEach(a => a.setShown(canSwitch));
  }

  // decide whether a pointer gesture over the character area is a skin swipe.
  // deltas + start-y are in logical (480×800) units. Only fires for a clearly
  // horizontal drag above the button stack; ignores taps and vertical scrolls.
  onSwipe(dx, dy, startY) {
    if (startY >= 520) return false;                 // keep the button zone tap-only
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.5) return false;
    this.cycleSkin(dx < 0 ? 1 : -1);                 // swipe left → next, right → prev
    return true;
  }

  // switch the equipped skin to the next/previous owned one and refresh visuals
  cycleSkin(dir) {
    const owned = this.ownedSkins();
    if (owned.length <= 1) return;
    const save = window.SAVE.data;
    let i = owned.indexOf(save.skin);
    if (i < 0) i = 0;
    const id = owned[(i + dir + owned.length) % owned.length];
    save.skin = id;
    window.SAVE.save();
    if (window.SFX && window.SFX.click) window.SFX.click();

    window.SKIN = {
      idle: `skin-${id}-idle`,
      fly: this.textures.exists(`skin-${id}-fly`) ? `skin-${id}-fly` : `skin-${id}-idle`,
      hit: this.textures.exists(`skin-${id}-hit`) ? `skin-${id}-hit` : null,
    };
    const srcH = this.textures.get(window.SKIN.idle).getSourceImage().height;
    this.char.setTexture(window.SKIN.idle).setScale(150 / srcH);
    const skinDef = CATALOG.SKINS[id] || {};
    const capIcon = (skinDef.cap && this.textures.exists(skinDef.cap)) ? skinDef.cap : 'cap';
    if (this.jetIcon) this.jetIcon.setTexture(capIcon);
    if (this.jetShadow) this.jetShadow.setTexture(capIcon);  // keep the shadow in step
  }

  onAuth() {
    const fb = window.FB;
    // before Firebase resolves the restored session, FB.user is still null
    // while _lastUid holds the hint — comparing them now would restart the
    // scene, whose create() calls onAuth again: an infinite restart loop that
    // freezes the tab. Wait for the real fb-auth event instead.
    if (fb && !fb.authResolved) return;
    // a real sign-in/out (identity change) rebuilds the menu so the equipped
    // skin, fleet, map and pills all reflect the loaded/reset save
    const uid = (fb && fb.user) ? fb.user.uid : null;
    if (uid !== this._lastUid) {
      this._lastUid = uid;
      this.scene.restart();
      return;
    }
    // prompt for a leaderboard name on first sign-in — only once the profile
    // has actually loaded, so a mid-load refresh doesn't falsely prompt
    if (fb && fb.user && fb.profileLoaded
        && (!fb.profile || !fb.profile.username) && !this._prompting) {
      this._prompting = true;
      window.pickUsername('', () => { this._prompting = false; });
    }
    // reflect the merged (login) or reset-to-guest (sign-out) save immediately
    this.refreshStats();
    this.refreshWelcome();
    this.updateAccountChip();
    this.refreshDaily();

    // A bonus waiting is worth showing rather than hoping the player spots the
    // dot — but only once per app open, and never on top of the name prompt.
    const st = window.DAILY && window.DAILY.state();
    if (st && st.claimable && !this._prompting && !window._dailyShown
        && fb && fb.profileLoaded && fb.profile && fb.profile.username) {
      window._dailyShown = true;
      this.time.delayedCall(700, () => { if (window.DAILY) window.DAILY.open(); });
    }
  }

  // red dot + nudge while today's bonus is unclaimed
  refreshDaily() {
    if (!this.dailyDot || !window.DAILY) return;
    const claimable = window.DAILY.state().claimable;
    this.dailyDot.setVisible(claimable);
    if (!this.dailyPulse) return;
    if (claimable) {
      this.dailyPulse.resume();
    } else {
      this.dailyPulse.pause();
      if (this.dailyBtn) this.dailyBtn.setScale(1);
    }
  }

  refreshWelcome() {
    const fb = window.FB;
    let name = (fb && fb.profile && fb.profile.username) ? fb.profile.username : null;
    if (!name) {
      const hint = this.authHint();
      if (hint && hint.username) name = hint.username;
    }
    if (this.welcomeText) this.welcomeText.setText(`WELCOME, ${(name || 'GUEST').toUpperCase()}`);
  }

  // A pill that fits its own contents: icon, gap, value. Returns a `set()` so
  // a changed value re-lays the pill out instead of leaving it stretched.
  makeStatPill(x, y, iconKey, iconScale, value, color, h = 40, size = 22) {
    const TS = window.TEX_SCALE;
    const g = this.add.graphics();
    const icon = this.add.image(0, y + h / 2, iconKey).setScale(iconScale * TS).setDepth(1);
    const text = this.add.text(0, y + h / 2 + 1, value, {
      fontFamily: window.FONT, fontSize: size + 'px', color,
    }).setOrigin(0, 0.5).setDepth(1);

    const layout = () => {
      const padL = 10, gap = 7, padR = 12;
      icon.x = x + padL + icon.displayWidth / 2;
      text.x = icon.x + icon.displayWidth / 2 + gap;
      const w = padL + icon.displayWidth + gap + text.width + padR;
      g.clear();
      // Same shape as the PLAY button — flat fill, 4px gold rim, no sunken
      // shading. Every readout in the header is built from this one recipe.
      uiPanel(this, x, y, w, h, {
        g, color: window.THEME.surfaceHighest, radius: 12,
        borderWidth: 2, strokeColor: window.THEME.secondary,
      });
    };
    layout();
    return { text, icon, set: (v) => { text.setText(v); layout(); } };
  }

  refreshStats() {
    const save = window.SAVE.data;
    if (this.coinPill) this.coinPill.set(`${save.bank}`);
    if (this.billPill) this.billPill.set(`${save.bills || 0}`);
    if (this.bestText) {
      this.bestText.setText(`BEST ${save.best}`);
      if (this.layoutBest) this.layoutBest();
    }
  }

  updateAccountChip() {
    if (this.acct) this.acct.destroy();
    const fb = window.FB;
    const W = this.scale.width / window.SS;
    const signedIn = fb && (fb.user || this.authHint());
    const T = window.THEME;
    // A profile picture stays round — that shape is what says "this is you" —
    // but it wears the same 2px gold rim as the readouts beside it, so it still
    // belongs to the row.
    const R = 17, cx = W - 12 - R, cy = 29;
    const c = this.add.container(cx, cy).setDepth(6);
    const circle = this.add.circle(0, 0, R, signedIn ? T.surfaceHigh : T.surfaceHighest)
      .setStrokeStyle(2, T.secondary, 1)
      .setInteractive({ useHandCursor: true });
    c.add(circle);

    // signed in: the chosen Trump-skin face (pre-rendered circular avatar).
    // guests get a plain silhouette — no profile picture.
    const faceKey = 'face-' + (window.SAVE.data.pfp || 'trump');
    if (signedIn && this.textures.exists(faceKey)) {
      const img = this.add.image(0, 0, faceKey).setDisplaySize((R - 1.5) * 2, (R - 1.5) * 2);
      c.add(img);
    } else if (signedIn) {
      const hint = this.authHint();
      const name = (fb.profile && fb.profile.username) || (hint && hint.username) || '';
      c.add(this.add.text(0, 1, (name[0] || '?').toUpperCase(), {
        fontFamily: FONT, fontSize: '18px', color: '#ffffff',
      }).setOrigin(0.5));
    } else {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 0.92);
      g.fillCircle(0, -4, 5);
      g.fillEllipse(0, 11, 17, 12);
      c.add(g);
    }
    circle.on('pointerup', () => {
      if (window.SFX && window.SFX.click) window.SFX.click();
      this.onAccountClick();
    });
    this.acct = c;
  }

  onAccountClick() {
    if (window.accountModal) window.accountModal();
  }

  go() {
    window.SFX.init();
    window.SFX.power();
    this.scene.start('Game');
  }

  update(_, dt) {
    const W = this.scale.width / window.SS;
    this.clouds.forEach(c => {
      c.x += c.speed * dt / 1000;
      if (c.x > W + 70) c.x = -70;
    });
  }
}
