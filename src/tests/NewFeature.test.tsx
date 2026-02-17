import { render, screen } from '@testing-library/react';
import NewFeature from '@/components/NewFeature';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';

const mockStore = configureStore([]);

describe('NewFeature Component', () => {
  it('renders loading state', () => {
    const store = mockStore({ newFeature: { loading: true, data: null } });
    render(
      <Provider store={store}>
        <NewFeature />
      </Provider>
    );
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  it('renders data when available', () => {
    const mockData = { id: 1, name: 'Test Data' };
    const store = mockStore({ newFeature: { loading: false, data: mockData } });
    render(
      <Provider store={store}>
        <NewFeature />
      </Provider>
    );
    expect(screen.getByText(/New Feature/i)).toBeInTheDocument();
    // Assuming SomeUIComponent will render the mockData
  });
});
