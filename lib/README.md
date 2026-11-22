# lib/ — 모든 게임이 함께 쓰는 도구

인터넷(CDN)에 기대지 않고 저장소 안에 직접 넣어 두었습니다.
학교 와이파이가 느리거나 외부 사이트가 막혀 있어도 게임이 열립니다.

| 폴더 | 무엇 | 버전 | 라이선스 |
|---|---|---|---|
| `phaser/` | Phaser — 2D 게임 엔진 (충돌, 애니메이션, 장면 전환, 터치) | 4.2.1 | MIT |
| `zzfx/` | ZzFX — 코드 한 줄 효과음 | 1.4.0 | MIT |
| `jsfxr/` | jsfxr — 8비트 효과음을 WAV 로 만드는 도구 | 1.4.1 | Unlicense (퍼블릭 도메인) |
| `sfx.js` | 우리 게임용 효과음 모음 (ZzFX 위에 만든 도우미) | — | 이 저장소 |
| `demo.html` | 세 도구를 한 번에 시험하는 페이지 | — | — |

시험 페이지: `lib/demo.html` (게임 사이트에서는 `/lib/demo.html`)

## 1. 효과음 넣기 (가장 쉬움)

게임 폴더(예: `gotjawal-quiz/index.html`)에서:

```html
<script src="../lib/zzfx/ZzFXMicro.min.js"></script>
<script src="../lib/sfx.js"></script>
<script>
  // 정답일 때
  SFX.play('correct');
  // 오답일 때
  SFX.play('wrong');
</script>
```

준비된 소리: `click` 클릭, `pop` 뿅, `correct` 정답, `wrong` 오답, `coin` 코인,
`jump` 점프, `hit` 부딪힘, `powerup` 파워업, `countdown` 카운트, `win` 승리 멜로디, `lose` 패배 멜로디.

- 소리 끄기·켜기: `SFX.mute(true)` / `SFX.mute(false)`
- 휴대폰은 화면을 처음 누르기 전까지 소리를 막습니다. `sfx.js` 가 첫 터치 때 자동으로 풀어 줍니다.
- 새 소리 만들기: [ZzFX 디자이너](https://killedbyapixel.github.io/ZzFX/)에서 소리를 만들고
  복사한 숫자를 `SFX.add('종소리', [ ...숫자... ])` 로 넣으면 `SFX.play('종소리')` 로 씁니다.

## 2. Phaser 로 게임 만들기

```html
<script src="../lib/phaser/phaser.min.js"></script>
<script>
  new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', width: 360, height: 640,
    physics: { default: 'arcade' },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: { preload() { /* 그림 불러오기 */ }, create() { /* 화면 만들기 */ }, update() { /* 매 순간 */ } }
  });
</script>
```

- **휴대폰 화면 맞춤:** `Phaser.Scale.FIT` 은 부모 칸(`#game`) 크기에 맞춥니다.
  부모 칸에 높이나 `aspect-ratio` 를 꼭 정해 주세요. 정하지 않으면 캔버스 아래 내용이 화면 밖으로 밀려납니다.
- Phaser 4 는 Phaser 3 와 거의 같게 씁니다. 인터넷 예제(대부분 Phaser 3)를 그대로 따라 해도 대부분 동작합니다.

## 3. jsfxr (필요할 때만)

ZzFX 로 충분하지 않고 `.wav` 파일이 꼭 필요할 때 씁니다.

```html
<script src="../lib/jsfxr/riffwave.js"></script>
<script src="../lib/jsfxr/sfxr.js"></script>
<script>
  var sfxr = jsfxr.sfxr;
  var a = sfxr.toAudio(sfxr.generate('pickupCoin'));
  a.play();   // 종류: pickupCoin, laserShoot, explosion, powerUp, hitHurt, jump, blipSelect, synth, tone, click, random
</script>
```

## 그림 자료

무료 그림은 `assets/kenney/` 에 있습니다. 그 폴더의 `README.md` 를 보세요.
