import {useId} from 'react';
import {useReviewForm} from '@/hooks/use-review-form/use-review-form';
import {MIN_REVIEW_TEXT_LENGTH} from '@/hooks/use-review-form/review-form-reducer';

// Форма отзыва (H8) из вёрстки (markup/offer.html): оценка звёздами,
// текст с подсказкой и кнопка Submit. Состояние и черновик держит хук
// useReviewForm; во время отправки заблокированы и кнопка, и вся форма.
// Компонент рассчитан на монтирование под конкретный offerId (key у
// потребителя): при смене предложения форма перечитывает чужой черновик.

const RATING_OPTIONS = [1, 2, 3, 4, 5] as const;

const RATING_LABELS: Record<number, string> = {
  1: 'terribly',
  2: 'badly',
  3: 'not bad',
  4: 'good',
  5: 'perfect',
};

interface ReviewFormProps {
  offerId: string;
}

export function ReviewForm({offerId}: ReviewFormProps) {
  const {rating, text, status, error, isValid, setRating, setText, submit} = useReviewForm(offerId);
  const ratingGroupId = useId();
  const isSubmitting = status === 'submitting';

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  function handleRatingChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextRating = Number(event.currentTarget.value);

    setRating(Number.isInteger(nextRating) ? nextRating : 0);
  }

  return (
    <form className="review-form" onSubmit={handleSubmit} noValidate>
      <h3 className="review-form__title">Your review</h3>

      <fieldset className="rating-input" disabled={isSubmitting}>
        <legend className="rating-input__legend">Your rating</legend>
        <div className="rating-input__stars">
          {RATING_OPTIONS.map((option) => {
            const optionId = `${ratingGroupId}-${String(option)}`;

            return (
              <label className="rating-input__star" key={option} htmlFor={optionId}>
                <input
                  className="rating-input__control"
                  type="radio"
                  id={optionId}
                  name={`${ratingGroupId}-rating`}
                  value={option}
                  checked={rating === option}
                  onChange={handleRatingChange}
                  disabled={isSubmitting}
                />
                <svg aria-hidden="true"><use href="#icon-star" /></svg>
                <span className="visually-hidden">{RATING_LABELS[option]}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="visually-hidden" htmlFor="review-text">Review text</label>
      <textarea
        className="field review-form__textarea"
        id="review-text"
        name="review"
        rows={5}
        minLength={MIN_REVIEW_TEXT_LENGTH}
        maxLength={300}
        placeholder="Tell how was your stay, what you like and what can be improved"
        aria-describedby="review-hint"
        value={text}
        disabled={isSubmitting}
        onChange={(event) => {
          setText(event.currentTarget.value);
        }}
      />

      <div className="review-form__footer">
        <p className="review-form__hint" id="review-hint">
          To submit review please make sure to set rating and describe your stay with at least{' '}
          <b>{String(MIN_REVIEW_TEXT_LENGTH)} characters</b>.
        </p>
        {status === 'error' && error !== null ? (
          <p className="form-error" role="alert">{error}</p>
        ) : null}
        {status === 'success' ? (
          <p className="review-form__hint" role="status">Your review has been posted.</p>
        ) : null}
        <button className="button review-form__submit" type="submit" disabled={!isValid || isSubmitting}>
          {isSubmitting ? 'Submitting…' : 'Submit'}
        </button>
      </div>
    </form>
  );
}
