// H8. Автомат формы отзыва: editing -> submitting -> success | error.
// Редьюсер - чистая функция и тестируется отдельно от хука. Недопустимые
// переходы игнорируются: действие применяется только из состояния, в котором
// оно имеет смысл, иначе возвращается прежнее состояние (никаких throw).

export type ReviewFormStatus = 'editing' | 'submitting' | 'success' | 'error';

export interface ReviewFormState {
  status: ReviewFormStatus;
  rating: number;
  text: string;
  error: string | null;
}

export type ReviewFormAction =
  | {type: 'SET_RATING'; rating: number}
  | {type: 'SET_TEXT'; text: string}
  | {type: 'SYNC_DRAFT'; rating: number; text: string}
  | {type: 'SUBMIT'}
  | {type: 'SUBMIT_SUCCESS'}
  | {type: 'SUBMIT_FAILURE'; error: string};

export const INITIAL_REVIEW_FORM_STATE: ReviewFormState = {
  status: 'editing',
  rating: 0,
  text: '',
  error: null,
};

// Правила валидации из PROJECT.md, раздел 4.3: оценка 1-5, текст 50-300
// символов. Кнопка неактивна, пока данные невалидны.
export const MIN_REVIEW_TEXT_LENGTH = 50;
export const MAX_REVIEW_TEXT_LENGTH = 300;

export function isReviewFormValid(state: ReviewFormState): boolean {
  const isRatingValid = Number.isInteger(state.rating) && state.rating >= 1 && state.rating <= 5;
  const isTextValid =
    state.text.length >= MIN_REVIEW_TEXT_LENGTH && state.text.length <= MAX_REVIEW_TEXT_LENGTH;

  return isRatingValid && isTextValid;
}

export function reviewFormReducer(
  state: ReviewFormState,
  action: ReviewFormAction,
): ReviewFormState {
  switch (action.type) {
    case 'SET_RATING': {
      // Во время отправки форма заблокирована. После успеха или ошибки
      // любое изменение возвращает к редактированию и снимает сообщение.
      if (state.status === 'submitting') {
        return state;
      }

      return {...state, status: 'editing', rating: action.rating, error: null};
    }

    case 'SET_TEXT': {
      if (state.status === 'submitting') {
        return state;
      }

      return {...state, status: 'editing', text: action.text, error: null};
    }

    case 'SYNC_DRAFT': {
      // Входящее обновление черновика (H6: событие storage из другой
      // вкладки, в том числе удаление ключа после чужой отправки). Во
      // время отправки форма заблокирована; во всех остальных состояниях
      // внешние поля ведут себя как любая правка: возврат к editing.
      if (state.status === 'submitting') {
        return state;
      }

      return {
        ...state,
        status: 'editing',
        rating: action.rating,
        text: action.text,
        error: null,
      };
    }

    case 'SUBMIT': {
      // Отправка возможна из editing и из error (повтор после неудачи) и
      // только с валидными данными: повторное нажатие «Submit» во время
      // отправки ничего не делает.
      const canSubmit = state.status === 'editing' || state.status === 'error';

      if (!canSubmit || !isReviewFormValid(state)) {
        return state;
      }

      return {...state, status: 'submitting', error: null};
    }

    case 'SUBMIT_SUCCESS': {
      if (state.status !== 'submitting') {
        return state;
      }

      // После успеха форма очищается.
      return {status: 'success', rating: 0, text: '', error: null};
    }

    case 'SUBMIT_FAILURE': {
      if (state.status !== 'submitting') {
        return state;
      }

      // При ошибке данные не теряются: только статус и сообщение.
      return {...state, status: 'error', error: action.error};
    }

    default: {
      return state;
    }
  }
}
