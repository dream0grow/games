/*
 * sfx.js — 교실 게임용 효과음 도우미 (ZzFX 기반, 소리 파일 없음)
 *
 * 사용법 (HTML):
 *   <script src="../lib/zzfx/ZzFXMicro.min.js"></script>
 *   <script src="../lib/sfx.js"></script>
 *   <script>
 *     SFX.play('correct');   // 정답 "띵"
 *     SFX.play('wrong');     // 오답 "뿌우"
 *     SFX.mute(true);        // 소리 끄기 (false 로 켜기)
 *   </script>
 *
 * 휴대폰은 화면을 처음 누르기 전에는 소리를 막아 두므로,
 * 첫 터치·클릭 때 자동으로 소리를 깨웁니다.
 */
(function () {
  'use strict';

  // ZzFX 매개변수 순서:
  // [볼륨, 무작위, 주파수, 어택, 서스테인, 릴리스, 파형, 파형곡선, 슬라이드, 델타슬라이드,
  //  음높이점프, 점프시간, 반복시간, 잡음, 변조, 비트크러시, 지연, 서스테인볼륨, 감쇠, 트레몰로, 필터]
  var PRESETS = {
    click:   [0.6, 0.02, 900, 0, 0, 0.03, 1],
    pop:     [0.8, 0.05, 600, 0, 0, 0.08, 0, 1, 20],
    correct: [1, 0, 880, 0, 0.05, 0.25, 0, 1, 0, 0, 440, 0.08],
    wrong:   [1, 0, 160, 0, 0.12, 0.3, 2, 1, -4],
    coin:    [0.9, 0, 1200, 0, 0.02, 0.15, 1, 1, 0, 0, 600, 0.05],
    jump:    [0.8, 0, 300, 0, 0.05, 0.2, 0, 1, 8],
    hit:     [1, 0.1, 110, 0, 0.05, 0.2, 4, 1],
    powerup: [0.9, 0, 400, 0, 0.1, 0.3, 1, 1, 12, 0, 0, 0, 0.06],
    countdown: [0.7, 0, 660, 0, 0.05, 0.1, 0]
  };

  // 여러 음을 이어 붙인 짧은 멜로디 (주파수 Hz, 시작 시각 ms)
  var TUNES = {
    win:  [[523, 0], [659, 120], [784, 240], [1047, 380]],
    lose: [[392, 0], [330, 180], [262, 360]]
  };

  var muted = false;

  function ready() {
    return typeof zzfx === 'function';
  }

  function play(name) {
    if (muted) return;
    if (!ready()) {
      console.warn('[SFX] ZzFXMicro.min.js 를 sfx.js 보다 먼저 불러와 주세요.');
      return;
    }
    if (TUNES[name]) {
      TUNES[name].forEach(function (n) {
        setTimeout(function () { zzfx(0.8, 0, n[0], 0, 0.05, 0.2, 0); }, n[1]);
      });
      return;
    }
    var p = PRESETS[name];
    if (!p) {
      console.warn('[SFX] 없는 효과음 이름입니다: ' + name);
      return;
    }
    zzfx.apply(null, p);
  }

  // 휴대폰 소리 깨우기: 첫 터치/클릭/키 입력에서 AudioContext 재개
  function unlock() {
    try {
      if (typeof zzfxX !== 'undefined' && zzfxX.state === 'suspended') zzfxX.resume();
    } catch (e) { /* 무시 */ }
  }
  ['pointerdown', 'touchstart', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, unlock, { passive: true });
  });

  window.SFX = {
    play: play,
    mute: function (on) { muted = on !== false; return muted; },
    isMuted: function () { return muted; },
    names: function () { return Object.keys(PRESETS).concat(Object.keys(TUNES)); },
    // 나만의 효과음 추가: SFX.add('bell', [1,0,1500,...]) — 매개변수는 ZzFX 디자이너에서 복사
    add: function (name, params) { PRESETS[name] = params; }
  };
})();
