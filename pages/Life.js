import React, {useState, useEffect} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from 'styled-components';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faTimes} from '@fortawesome/free-solid-svg-icons';

import {localDb} from '../common/db';
import Template from '../template';
import {dbAll, dbDelete} from '../common/api';
import {Link} from 'react-router-dom';
import ArticleTitle from '../components/ArticleTitle';
import {Tab, Tabs} from '../components/Tabs';
import {selectCurrentDb, selectUserInfo} from '../common/selector';

const StyledLife = styled.div`
  width: 90%;
  max-width: 1050px;
  margin: 3em auto 0;
`;
const Life = () => {
  const [remoteList, setRemoteList] = useState([]);
  const [localList, setLocalList] = useState([]);
  const currentDb = useSelector(selectCurrentDb);
  const userInfo = useSelector(selectUserInfo);

  console.log('currentDb', currentDb);

  const [choose, setchoose] = useState('local');
  const dispatch = useDispatch();

  const getData = () => {
    dbAll(currentDb.remote).then((result) => {
      if (result) {
        console.log('result', result);
        setRemoteList(result.rows);
      }
    });
    dbAll(localDb).then((result) => {
      if (result) {
        setLocalList(result.rows);
      }
    });
  };
  const goDelete = async (id) => {
    //delete will go ??
    try {
      const deleteResult = await dbDelete(localDb, id);
      console.log('deleteResult', deleteResult);
      if (deleteResult) {
        getData();
        closeModal();
      }
    } catch (err) {
      modal({
        modalType: 'warning',
        content: err.message,
        hasClose: true,
      });
      console.log(err);
    }
  };
  const modal = (modalInfo) => {
    dispatch({type: 'modal', payload: {modalInfo: {...modalInfo}}});
  };
  const closeModal = () => dispatch({type: 'closeModal'});
  useEffect(() => {
    getData();
    return () => {};
  }, [userInfo]);

  const handleDetele = async (id) => {
    console.log('id', id);
    modal({
      modalType: 'warning',
      title: '确认删除？',
      content: '删除内容不可恢复！',
      buttons: [
        {
          text: '取消',
          className: 'button-warning-cancel',
          onClick: closeModal,
        },
        {
          text: '确认',
          className: 'button-warning-blue',
          onClick: () => {
            goDelete(id);
          },
        },
      ],
    });
  };
  return (
    <Template>
      <Tabs>
        <Tab
          active={choose === 'remote'}
          onClick={() => {
            setchoose('remote');
          }}>
          远程
        </Tab>
        <Tab
          active={choose === 'local'}
          onClick={() => {
            setchoose('local');
          }}>
          本地
        </Tab>
      </Tabs>
      {choose === 'local' ? (
        <StyledLife>
          {localList.map((post) => (
            <ArticleTitle key={post.id}>
              <div>
                <Link to={{pathname: post.doc._id}}>
                  {post.doc.title || post.doc._id}
                </Link>
              </div>

              <div
                className="delete-button"
                onClick={() => handleDetele(post.doc._id)}>
                <FontAwesomeIcon icon={faTimes} />
              </div>

              {/*<p>{post.doc.content}</p>*/}
            </ArticleTitle>
          ))}
        </StyledLife>
      ) : (
        <StyledLife>
          {remoteList.map((post) => (
            <ArticleTitle key={post.id}>
              <div>
                <Link to={{pathname: post.doc._id}}>
                  {post.doc.title || post.doc._id}
                </Link>
              </div>

              <div
                className="delete-button"
                onClick={() => handleDetele(post.doc._id)}>
                <FontAwesomeIcon icon={faTimes} />
              </div>

              {/*<p>{post.doc.content}</p>*/}
            </ArticleTitle>
          ))}
        </StyledLife>
      )}
    </Template>
  );
};

export default Life;
