// Рейтинг звёздами из вёрстки: ширина заливки --rating, 20% на звезду.
// Округление до целого (3.1 -> 3, 4.5 -> 5) - здесь, в коде (markup/README.md).

interface RatingProps {
  value: number;
  large?: boolean;
  // На странице предложения рядом со звёздами стоит само число рейтинга,
  // поэтому там звёзды скрыты от скринридера (aria-hidden), как в вёрстке.
  labeled?: boolean;
}

export function Rating({value, large = false, labeled = true}: RatingProps) {
  const stars = Math.round(value);
  const widthPercent = `${String(stars * 20)}%`;
  const className = large ? 'rating rating--large' : 'rating';

  return (
    <div
      className={className}
      aria-label={labeled ? `Rating ${String(stars)} of 5` : undefined}
      aria-hidden={labeled ? undefined : true}
    >
      <span className="rating__fill" style={{'--rating': widthPercent}} />
    </div>
  );
}
