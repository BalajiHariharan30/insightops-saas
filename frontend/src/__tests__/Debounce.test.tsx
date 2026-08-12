import { useState } from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { useDebounce } from '../hooks/useDebounce';
import { vi, describe, it, expect } from 'vitest';

function TestComponent() {
  const [val, setVal] = useState('');
  const debounced = useDebounce(val, 200);
  return (
    <div>
      <input data-testid="search" value={val} onChange={(e) => setVal(e.target.value)} />
      <span data-testid="output">{debounced}</span>
    </div>
  );
}

describe('useDebounce React Hook', () => {
  it('defers updating value until designated duration passes', () => {
    vi.useFakeTimers();
    render(<TestComponent />);
    
    const input = screen.getByTestId('search');
    
    // Simulate user typing synchronously via fireEvent (supports fake timers)
    act(() => {
      fireEvent.change(input, { target: { value: 'insight' } });
    });

    // The output should still be empty because the 200ms timer hasn't fired
    expect(screen.getByTestId('output').textContent).toBe('');

    // Advance the timers by 200ms
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Output should now match the input
    expect(screen.getByTestId('output').textContent).toBe('insight');
    vi.useRealTimers();
  });
});
