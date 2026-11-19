// Статичная схема карты из вёрстки: нарисованное изображение (img/map.svg)
// с маркерами-пинами. Настоящая карта - Яндекс Карты (этап 5), поэтому
// схема остаётся декоративной: позиции пинов фиксированы, как в markup.

const PIN_POSITIONS = [
  {left: '22%', top: '30%'},
  {left: '45%', top: '22%'},
  {left: '62%', top: '40%'},
  {left: '38%', top: '52%'},
  {left: '70%', top: '63%'},
  {left: '28%', top: '70%'},
  {left: '55%', top: '78%'},
  {left: '80%', top: '28%'},
];

interface MapSchemeProps {
  pinCount: number;
  activeIndex?: number;
}

export function MapScheme({pinCount, activeIndex = -1}: MapSchemeProps) {
  return (
    <div className="map">
      {Array.from({length: pinCount}, (_, index) => (
        <span
          key={index}
          className={index === activeIndex ? 'map__pin map__pin--active' : 'map__pin'}
          style={PIN_POSITIONS[index % PIN_POSITIONS.length]}
        >
          <svg aria-hidden="true">
            <use href="#icon-pin" />
          </svg>
        </span>
      ))}
      <span className="map__note">Здесь - Яндекс Карты</span>
    </div>
  );
}
