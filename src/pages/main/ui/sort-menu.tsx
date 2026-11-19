import {useRef, useState} from 'react';
import {useOutsideClick} from '@/hooks/use-outside-click/use-outside-click';
import {useKeydown} from '@/hooks/use-keydown/use-keydown';
import {SORT_LABELS, SORT_VALUES, type SortValue} from '../model/sort-offers';

// Меню сортировки (H3): закрывается кликом снаружи и по Escape, стрелки
// вверх/вниз двигают выделение, Enter выбирает. Подписки на document
// существуют только пока меню открыто (isActive в хуках H3).

interface SortMenuProps {
  value: SortValue;
  onChange: (nextValue: SortValue) => void;
}

function getOptionIndex(sortValue: SortValue): number {
  return SORT_VALUES.indexOf(sortValue);
}

export function SortMenu({value, onChange}: SortMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(() => getOptionIndex(value));
  const menuRef = useRef<HTMLDivElement>(null);

  function openMenu() {
    setFocusedIndex(getOptionIndex(value));
    setIsOpen(true);
  }

  function closeMenu() {
    setIsOpen(false);
  }

  function selectValue(nextValue: SortValue) {
    onChange(nextValue);
    closeMenu();
  }

  useOutsideClick(menuRef, closeMenu, isOpen);
  useKeydown('Escape', closeMenu, isOpen);
  useKeydown(
    'ArrowDown',
    (event) => {
      event.preventDefault();
      setFocusedIndex((previousIndex) => Math.min(previousIndex + 1, SORT_VALUES.length - 1));
    },
    isOpen,
  );
  useKeydown(
    'ArrowUp',
    (event) => {
      event.preventDefault();
      setFocusedIndex((previousIndex) => Math.max(previousIndex - 1, 0));
    },
    isOpen,
  );
  useKeydown(
    'Enter',
    (event) => {
      // Меню открыто: Enter выбирает выделенный пункт и гасит нативную
      // активацию кнопки, которая его открыла.
      event.preventDefault();
      selectValue(SORT_VALUES[focusedIndex]);
    },
    isOpen,
  );

  const currentOptionId = `sort-option-${SORT_VALUES[focusedIndex]}`;
  const menuClassName = isOpen ? 'sort sort--opened' : 'sort';

  return (
    <div className={menuClassName} ref={menuRef}>
      <span className="sort__caption" id="sort-caption">Sort by</span>
      <button
        className="sort__current"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby="sort-caption sort-current"
        onClick={isOpen ? closeMenu : openMenu}
      >
        <span id="sort-current">{SORT_LABELS[value]}</span>
        <svg className="sort__arrow" aria-hidden="true"><use href="#icon-arrow" /></svg>
      </button>
      <ul
        className="sort__list"
        role="listbox"
        aria-labelledby="sort-caption"
        aria-activedescendant={currentOptionId}
        tabIndex={-1}
      >
        {SORT_VALUES.map((sortValue, index) => {
          const isActive = sortValue === value;
          const isFocused = index === focusedIndex;
          const optionClassName = [
            'sort__option',
            isActive ? 'sort__option--active' : '',
            isFocused ? 'sort__option--focused' : '',
          ]
            .filter((classNamePart) => classNamePart !== '')
            .join(' ');

          return (
            <li
              key={sortValue}
              id={`sort-option-${sortValue}`}
              className={optionClassName}
              role="option"
              aria-selected={isActive}
              tabIndex={-1}
              onMouseEnter={() => {
                setFocusedIndex(index);
              }}
              onKeyDown={(event) => {
                // Клавиатура на пункте: Enter и Space выбирают его же, а не
                // «выделенный» из документного слушателя - и не дублируют.
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  event.stopPropagation();
                  selectValue(sortValue);
                }
              }}
              onClick={() => {
                selectValue(sortValue);
              }}
            >
              {SORT_LABELS[sortValue]}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
