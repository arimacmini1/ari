import { FETCH_DATA_START, FETCH_DATA_SUCCESS, FETCH_DATA_ERROR } from '@/actions/newFeatureActions';

interface NewFeatureState {
  data: any;
  loading: boolean;
  error: string | null;
}

const initialState: NewFeatureState = {
  data: null,
  loading: false,
  error: null,
};

const newFeatureReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case FETCH_DATA_START:
      return { ...state, loading: true, error: null };
    case FETCH_DATA_SUCCESS:
      return { ...state, loading: false, data: action.payload };
    case FETCH_DATA_ERROR:
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

export default newFeatureReducer;
