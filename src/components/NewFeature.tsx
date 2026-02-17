// NewFeature.tsx

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNewFeatureData } from '@/actions/newFeatureActions';
import styles from './NewFeature.module.css';
import { RootState } from '@/store';
import SomeUIComponent from '@/components/ui/SomeUIComponent';

const NewFeature: React.FC = () => {
  const dispatch = useDispatch();
  const data = useSelector((state: RootState) => state.newFeature.data);
  const loading = useSelector((state: RootState) => state.newFeature.loading);

  useEffect(() => {
    dispatch(fetchNewFeatureData());
  }, [dispatch]);

  return (
    <div className={styles.newFeatureContainer}>
      <h1>New Feature</h1>
      {loading ? <p>Loading...</p> : <SomeUIComponent data={data} />}
    </div>
  );
};

export default NewFeature;
