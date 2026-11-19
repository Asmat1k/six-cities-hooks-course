import {describe, expect, it} from 'vitest';
import {
  INITIAL_REVIEW_FORM_STATE,
  MAX_REVIEW_TEXT_LENGTH,
  MIN_REVIEW_TEXT_LENGTH,
  isReviewFormValid,
  reviewFormReducer,
  type ReviewFormState,
} from './review-form-reducer';

// Тесты редьюсера H8: он тестируется отдельно как чистая функция - все
// переходы автомата и игнорирование недопустимых переходов.

const VALID_TEXT = 'A'.repeat(MIN_REVIEW_TEXT_LENGTH);

const validState: ReviewFormState = {
  status: 'editing',
  rating: 4,
  text: VALID_TEXT,
  error: null,
};

const submittingState: ReviewFormState = {
  status: 'submitting',
  rating: 4,
  text: VALID_TEXT,
  error: null,
};

describe('isReviewFormValid', () => {
  it('accepts a rating of 1-5 and text of 50-300 characters', () => {
    expect(isReviewFormValid(validState)).toBe(true);
    expect(isReviewFormValid({...validState, rating: 1, text: 'B'.repeat(MAX_REVIEW_TEXT_LENGTH)})).toBe(true);
  });

  it('rejects a missing rating', () => {
    expect(isReviewFormValid({...validState, rating: 0})).toBe(false);
    expect(isReviewFormValid(INITIAL_REVIEW_FORM_STATE)).toBe(false);
  });

  it('rejects an out-of-range rating', () => {
    expect(isReviewFormValid({...validState, rating: 6})).toBe(false);
    expect(isReviewFormValid({...validState, rating: 4.5})).toBe(false);
  });

  it('rejects text shorter than 50 or longer than 300 characters', () => {
    expect(isReviewFormValid({...validState, text: 'A'.repeat(MIN_REVIEW_TEXT_LENGTH - 1)})).toBe(false);
    expect(isReviewFormValid({...validState, text: 'A'.repeat(MAX_REVIEW_TEXT_LENGTH + 1)})).toBe(false);
  });
});

describe('reviewFormReducer', () => {
  it('starts in editing with empty data', () => {
    expect(INITIAL_REVIEW_FORM_STATE).toEqual({
      status: 'editing',
      rating: 0,
      text: '',
      error: null,
    });
  });

  it('SET_RATING from editing updates the rating', () => {
    const state = reviewFormReducer(INITIAL_REVIEW_FORM_STATE, {type: 'SET_RATING', rating: 5});

    expect(state).toEqual({...INITIAL_REVIEW_FORM_STATE, rating: 5});
  });

  it('SET_TEXT from editing updates the text', () => {
    const state = reviewFormReducer(INITIAL_REVIEW_FORM_STATE, {type: 'SET_TEXT', text: 'Hello'});

    expect(state).toEqual({...INITIAL_REVIEW_FORM_STATE, text: 'Hello'});
  });

  it('editing inputs are ignored while submitting (the form is blocked)', () => {
    expect(reviewFormReducer(submittingState, {type: 'SET_RATING', rating: 1})).toBe(submittingState);
    expect(reviewFormReducer(submittingState, {type: 'SET_TEXT', text: 'changed'})).toBe(submittingState);
    expect(reviewFormReducer(submittingState, {type: 'SUBMIT'})).toBe(submittingState);
  });

  it('SUBMIT from editing with valid data moves to submitting', () => {
    const state = reviewFormReducer(validState, {type: 'SUBMIT'});

    expect(state.status).toBe('submitting');
    expect(state.rating).toBe(4);
    expect(state.text).toBe(VALID_TEXT);
  });

  it('SUBMIT with invalid data is ignored', () => {
    expect(reviewFormReducer(INITIAL_REVIEW_FORM_STATE, {type: 'SUBMIT'})).toBe(INITIAL_REVIEW_FORM_STATE);

    const noRating: ReviewFormState = {...validState, rating: 0};
    expect(reviewFormReducer(noRating, {type: 'SUBMIT'})).toBe(noRating);

    const shortText: ReviewFormState = {...validState, text: 'too short'};
    expect(reviewFormReducer(shortText, {type: 'SUBMIT'})).toBe(shortText);
  });

  it('SUBMIT_SUCCESS clears the form only from submitting', () => {
    const state = reviewFormReducer(submittingState, {type: 'SUBMIT_SUCCESS'});

    expect(state).toEqual({status: 'success', rating: 0, text: '', error: null});
    expect(reviewFormReducer(validState, {type: 'SUBMIT_SUCCESS'})).toBe(validState);
  });

  it('SUBMIT_FAILURE keeps the data and sets the message', () => {
    const state = reviewFormReducer(submittingState, {
      type: 'SUBMIT_FAILURE',
      error: 'Network error',
    });

    expect(state).toEqual({
      status: 'error',
      rating: 4,
      text: VALID_TEXT,
      error: 'Network error',
    });
    expect(reviewFormReducer(validState, {type: 'SUBMIT_FAILURE', error: 'x'})).toBe(validState);
  });

  it('SUBMIT from error retries the same data', () => {
    const failed: ReviewFormState = {
      status: 'error',
      rating: 4,
      text: VALID_TEXT,
      error: 'Network error',
    };

    const state = reviewFormReducer(failed, {type: 'SUBMIT'});

    expect(state).toEqual({status: 'submitting', rating: 4, text: VALID_TEXT, error: null});
  });

  it('editing after an error returns to editing and clears the message', () => {
    const failed: ReviewFormState = {
      status: 'error',
      rating: 4,
      text: VALID_TEXT,
      error: 'Network error',
    };

    const state = reviewFormReducer(failed, {type: 'SET_TEXT', text: `${VALID_TEXT}!`});

    expect(state).toEqual({
      status: 'editing',
      rating: 4,
      text: `${VALID_TEXT}!`,
      error: null,
    });
  });

  it('editing after success starts from the cleared form', () => {
    const succeeded: ReviewFormState = {status: 'success', rating: 0, text: '', error: null};
    const state = reviewFormReducer(succeeded, {type: 'SET_RATING', rating: 3});

    expect(state).toEqual({...INITIAL_REVIEW_FORM_STATE, rating: 3});
  });

  it('SYNC_DRAFT from editing replaces the fields with the incoming draft', () => {
    const state = reviewFormReducer(validState, {type: 'SYNC_DRAFT', rating: 2, text: 'From another tab.'});

    expect(state).toEqual({
      status: 'editing',
      rating: 2,
      text: 'From another tab.',
      error: null,
    });
  });

  it('SYNC_DRAFT is ignored while submitting (the form is blocked)', () => {
    expect(
      reviewFormReducer(submittingState, {type: 'SYNC_DRAFT', rating: 1, text: 'changed elsewhere'}),
    ).toBe(submittingState);
  });

  it('SYNC_DRAFT after an error returns to editing and clears the message', () => {
    const failed: ReviewFormState = {
      status: 'error',
      rating: 4,
      text: VALID_TEXT,
      error: 'Network error',
    };

    const state = reviewFormReducer(failed, {type: 'SYNC_DRAFT', rating: 0, text: ''});

    expect(state).toEqual(INITIAL_REVIEW_FORM_STATE);
  });

  it('SYNC_DRAFT after success refills the form with the incoming draft', () => {
    const succeeded: ReviewFormState = {status: 'success', rating: 0, text: '', error: null};

    const state = reviewFormReducer(succeeded, {type: 'SYNC_DRAFT', rating: 5, text: 'Back to editing.'});

    expect(state).toEqual({
      status: 'editing',
      rating: 5,
      text: 'Back to editing.',
      error: null,
    });
  });
});
