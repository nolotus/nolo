import React, {useEffect} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {hostDb, connectDb} from '../common/db';
import Modal from '../components/Modal';
async function getSession() {
  try {
    const doc = await hostDb.remote.getSession();
    return doc;
  } catch (err) {
    console.log('err', err);
  }
}
import Simple from './Simple';
const Template = (props) => {
  const templateName = useSelector((state) => state.templateName);
  const modalInfo = useSelector((state) => state.modalInfo);

  const dispatch = useDispatch();

  useEffect(() => {
    getSession().then((doc) => {
      if (doc.userCtx.name !== null) {
        const userDb = connectDb(doc.userCtx.name);
        const userInfo = doc.userCtx;
        dispatch({type: 'loginSuccess', payload: {userInfo, userDb}});
      }
    });
    return () => {};
  }, []);
  return (
    <>
      <Simple {...props} />
      {modalInfo.isVisible && <Modal modalInfo={modalInfo} />}
    </>
  );
};

export default Template;
