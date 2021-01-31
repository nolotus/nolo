import React, {useState, useEffect} from 'react';
import {useDispatch} from 'react-redux';
import styled from 'styled-components';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faTimes} from '@fortawesome/free-solid-svg-icons';

import {hostDb, localDb} from '../common/db';
import Template from '../template';
import {dbAll} from '../common/api';
import {Link} from 'react-router-dom';
import ArticleTitle from '../components/ArticleTitle';
import {Tab, Tabs} from '../components/Tabs';

const StyledLife = styled.div`
  width: 90%;
  max-width: 1050px;
  margin: 3em auto 0;
`;
const Life = () => {
  const [remoteList, setRemoteList] = useState([]);
  const [localList, setLocalList] = useState([]);
  const [list, setList] = useState([]);

  const [currentDb, setCurrentDb] = useState(hostDb.remote);
  const [choose, setchoose] = useState('local');
  const dispatch = useDispatch();

  const getData = () => {
    dbAll(currentDb).then((result) => {
      if (result) {
        console.log('result', result);
        setList(result.rows);
      }
    });
  };
  const goDelete = (id) => {
    currentDb
      .get(id)
      .then(async (doc) => {
        const result = await currentDb.remove(doc);
        console.log('handleDetele', result);
        getData();
        closeModal();
      })
      .catch(function (err) {
        modal({
          modalType: 'warning',
          content: err.message,
          hasClose: true,
        });
        console.log(err);
      });
  };
  const modal = (modalInfo) => {
    dispatch({type: 'modal', payload: {modalInfo: {...modalInfo}}});
  };
  const closeModal = () => dispatch({type: 'closeModal'});
  useEffect(() => {
    dbAll(currentDb).then((result) => {
      if (result) {
        console.log('remote', result);
        setRemoteList(result.rows);
      }
    });
    dbAll(localDb).then((result) => {
      if (result) {
        console.log('local', result);
        setLocalList(result.rows);
      }
    });
    return () => {};
  }, []);

  const handleDetele = async (id) => {
    modal({
      modalType: 'warning',
      title: `确认删除？`,
      content: `删除内容不可恢复！`,
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
