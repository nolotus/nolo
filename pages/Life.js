import React, {useState, useEffect} from 'react';
import {useDispatch} from 'react-redux';
import styled from 'styled-components';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faTimes} from '@fortawesome/free-solid-svg-icons';

import {hostDb} from '../common/db';
import Template from '../template';
import {dbAll} from '../common/api';
import {Link} from 'react-router-dom';
import ArticleTitle from '../components/ArticleTitle';

const StyledLife = styled.div`
  width: 90%;
  max-width: 1050px;
  margin: 3em auto 0;
`;
const Life = () => {
  const [list, setList] = useState([]);
  const [currentDb, setCurrentDb] = useState(hostDb.remote);
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
        console.log(err);
      });
  };
  const modal = (modalInfo) => {
    dispatch({type: 'modal', modalInfo: {...modalInfo, isVisible: true}});
  };
  const closeModal = () =>
    dispatch({type: 'modal', modalInfo: {isVisible: false}});
  useEffect(() => {
    dbAll(currentDb).then((result) => {
      if (result) {
        console.log('result', result);
        setList(result.rows);
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
      <StyledLife>
        {list.map((post) => (
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
    </Template>
  );
};

export default Life;
