import { ThunkAction } from 'redux-thunk';
import { Action } from 'redux';
import { RootState } from '@/store';

export const FETCH_DATA_START = 'FETCH_DATA_START';
export const FETCH_DATA_SUCCESS = 'FETCH_DATA_SUCCESS';
export const FETCH_DATA_ERROR = 'FETCH_DATA_ERROR';

export const fetchNewFeatureData = (): ThunkAction<void, RootState, unknown, Action<string>> => {
  return async (dispatch) => {
    dispatch({ type: FETCH_DATA_START });
    try {
      const response = await fetch('/api/newFeature'); // replace with actual API endpoint
      const data = await response.json();
      dispatch({ type: FETCH_DATA_SUCCESS, payload: data });
    } catch (error) {
      dispatch({ type: FETCH_DATA_ERROR, payload: error.message });
    }
  };
};
