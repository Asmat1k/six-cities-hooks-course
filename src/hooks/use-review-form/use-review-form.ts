import {useCallback, useEffect, useReducer, useRef} from 'react';
import {usePersistentState} from '@/hooks/use-persistent-state/use-persistent-state';
import {STORAGE_PREFIX} from '@/shared/config/variant';
import {
  isReviewFormValid,
  reviewFormReducer,
  type ReviewFormAction,
  type ReviewFormState,
  type ReviewFormStatus,
} from './review-form-reducer';

// H8. `useReviewForm(offerId, submitReview)` - форма отзыва как конечный
// автомат на useReducer (editing -> submitting -> success | error), где
// черновик {rating, text} живёт в localStorage через наш usePersistentState
// (H6) под ключом `<prefix>-draft-<offerId>` (параметр варианта 3:
// префикс sc-charlie). После успешной отправки черновик удаляется, при
// ошибке - сохраняется, данные не теряются.
//
// Отправка: по умолчанию - заглушка с задержкой (setTimeout + промис, без
// реального запроса), как требует этап 4; тесты и этап 7 подставляют свою
// функцию вторым аргументом. Хук рассчитан на монтирование под конкретный
// offerId: при смене предложения потребитель монтирует форму заново (key).

export interface ReviewDraft {
  rating: number;
  text: string;
}

export const EMPTY_REVIEW_DRAFT: ReviewDraft = {rating: 0, text: ''};

export function isReviewDraft(value: unknown): value is ReviewDraft {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (!('rating' in value) || !('text' in value)) {
    return false;
  }

  return typeof value.rating === 'number' && typeof value.text === 'string';
}

// Задержка заглушки: заметная, чтобы состояние «форма заблокирована» было
// видно и на экране, и в тестах.
export const SUBMIT_STUB_DELAY_MS = 1000;

export function submitReviewStub(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, SUBMIT_STUB_DELAY_MS);
  });
}

export type SubmitReview = () => Promise<void>;

export interface UseReviewFormResult {
  rating: number;
  text: string;
  status: ReviewFormStatus;
  error: string | null;
  isValid: boolean;
  setRating: (rating: number) => void;
  setText: (text: string) => void;
  submit: () => void;
}

function draftToState(draft: ReviewDraft): ReviewFormState {
  return {
    status: 'editing',
    rating: draft.rating,
    text: draft.text,
    error: null,
  };
}

export function useReviewForm(offerId: string, submitReview: SubmitReview = submitReviewStub): UseReviewFormResult {
  const draftKey = `${STORAGE_PREFIX}-draft-${offerId}`;
  const [draft, setDraft, removeDraft] = usePersistentState<ReviewDraft>(
    draftKey,
    EMPTY_REVIEW_DRAFT,
    isReviewDraft,
  );

  const [state, dispatch] = useReducer(reviewFormReducer, draft, draftToState);

  // Синхронная блокировка отправки. Статус в замыкании не обновляется до
  // следующего рендера: два submit() в одном тике (двойной клик/Enter до
  // перерисовки) оба видели бы editing и запускали бы submitReview дважды -
  // редьюсер отбрасывает второй SUBMIT, но не побочный эффект. Метка
  // ставится до вызова и снимается по завершении промиса, поэтому повтор
  // после ошибки снова проходит.
  const isSubmittingRef = useRef(false);

  // Локальная правка помечается синхронно, до коммита. В одном батче поля
  // и черновик на миг расходятся (черновик пишет эффект ниже), и без метки
  // синхронизация ниже приняла бы свежие поля за внешнее изменение и
  // откатила бы их к старому черновику. Метка живёт ровно до своего
  // коммита, где эффект записи её снимает.
  const isLocalEditRef = useRef(false);

  function applyLocalEdit(action: ReviewFormAction) {
    // Редьюсер сам решает, применим ли переход: во время отправки форма
    // заблокирована - отклонённая правка не помечается и не пишет черновик.
    const next = reviewFormReducer(state, action);

    if (next === state) {
      return;
    }

    isLocalEditRef.current = true;
    dispatch(action);
  }

  // Входящее обновление черновика (H6): событие storage из другой вкладки
  // или внешний removeItem меняет draft в usePersistentState - поля
  // следуют за ним. Синхронизация только читает черновик, ничего не
  // записывая: ключ, удалённый другой вкладкой, не оживает.
  useEffect(() => {
    if (isLocalEditRef.current) {
      return;
    }

    if (draft.rating === state.rating && draft.text === state.text) {
      return;
    }

    dispatch({type: 'SYNC_DRAFT', rating: draft.rating, text: draft.text});
  }, [draft, state]);

  // Черновик пишется только локальными правками, и только из фактического
  // состояния после коммита: несколько правок в одном батче всё равно дают
  // один черновик с итоговыми полями, а не с замыканием первой из них.
  useEffect(() => {
    if (!isLocalEditRef.current) {
      return;
    }

    isLocalEditRef.current = false;
    setDraft({rating: state.rating, text: state.text});
  }, [state, setDraft]);

  const submit = useCallback(() => {
    if (isSubmittingRef.current) {
      return;
    }

    const canSubmit = state.status === 'editing' || state.status === 'error';

    if (!canSubmit || !isReviewFormValid(state)) {
      return;
    }

    isSubmittingRef.current = true;
    dispatch({type: 'SUBMIT'});

    submitReview()
      .then(() => {
        isSubmittingRef.current = false;
        // Черновик отправлен - ключ стирается в одном батче с SUBMIT_SUCCESS:
        // раздельные записи дали бы мигание «очищено - снова заполнено».
        removeDraft();
        dispatch({type: 'SUBMIT_SUCCESS'});
      })
      .catch(() => {
        isSubmittingRef.current = false;
        dispatch({type: 'SUBMIT_FAILURE', error: 'Something went wrong while sending your review. Please try again.'});
      });
  }, [state, submitReview, removeDraft]);

  return {
    rating: state.rating,
    text: state.text,
    status: state.status,
    error: state.error,
    isValid: isReviewFormValid(state),
    setRating: (rating: number) => {
      applyLocalEdit({type: 'SET_RATING', rating});
    },
    setText: (text: string) => {
      applyLocalEdit({type: 'SET_TEXT', text});
    },
    submit,
  };
}
