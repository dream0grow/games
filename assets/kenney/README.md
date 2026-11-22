# Kenney 무료 그림 자료 (CC0)

[Kenney](https://kenney.nl)가 공개한 게임 그림입니다. **CC0(퍼블릭 도메인)**이라
수업, 학생 활동, 책, 연수 자료, 판매용 게임에 모두 자유롭게 쓸 수 있고 출처 표기도 필요 없습니다.
(표기하고 싶으면 "Kenney (kenney.nl)"라고 적으면 됩니다.)

이 환경에서는 kenney.nl 에 직접 접속할 수 없어서, Kenney 에셋을 정리해 둔 GitHub 저장소
[shorepine/kenney](https://github.com/shorepine/kenney) (커밋 `3694c68`)에서 아이들 게임에 맞는 묶음만 골라 받았습니다.

| 폴더 | 들어 있는 것 | 이런 게임에 |
|---|---|---|
| `Animal Pack Remastered/` | 동물 얼굴 30종 (토끼, 개구리, 부엉이, 펭귄 등) × 동그라미·네모, 테두리 유무 | 동물 퀴즈, 짝 맞추기, 캐릭터 |
| `New Platformer Pack/` | 캐릭터(걷기·점프 동작), 적, 블록·타일, 배경(언덕·숲·사막·버섯) | 점프 게임, 곶자왈 탐험 |
| `Foliage Pack/` | 나무, 덤불, 풀, 잎 | 숲·곶자왈 배경 |
| `UI Pack/` | 버튼, 체크 표시, 화살표, 슬라이더, 별 (파랑·초록·회색·빨강·노랑) | 메뉴, 정답·오답 표시 |
| `Mobile Controls/` | 휴대폰용 방향키, 조이스틱, 동작 버튼 | 휴대폰 조작 |
| `Game Icons/` | 설정, 소리, 집, 별, 자물쇠 등 아이콘 (흰색·검정) | 메뉴 아이콘 |
| `Medals/` | 메달 | 순위표, 상장 |
| `Smilies/` | 웃는 얼굴 표정 | 기분 표시, 반응 |
| `Particle Pack/PNG (Transparent)/` | 별, 불꽃, 연기, 반짝이 | 정답 효과, 폭발 |

전체 약 21MB, 그림 약 3,700장입니다.

## 쓰는 법

게임 폴더(예: `gotjawal-new/index.html`)에서 상대 경로로 부릅니다.

```html
<img src="../assets/kenney/Animal Pack Remastered/Round/rabbit.png" alt="토끼">
```

Phaser 에서는:

```js
this.load.image('rabbit', '../assets/kenney/Animal Pack Remastered/Round/rabbit.png');
```

## 더 필요할 때

받지 않은 묶음(우주, 탱크, 자동차, 카드, 보드게임, 3D 모델 등)이 더 있습니다.
"Kenney ○○ 팩도 넣어 줘"라고 말씀하시면 같은 방법으로 추가합니다.
소리 묶음은 이 저장소에 없으므로, 효과음은 `lib/sfx.js` (ZzFX)를 쓰세요.
