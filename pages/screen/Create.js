import React, {useState} from 'react';
import {View, TextInput} from 'react-native';
import styled from 'styled-components';
import {h1} from '../../common/text';

const getNewId = id => {
  console.log('id', id);
  const idArray = id.split('-');
  const nextId = Number(idArray[idArray.length - 1]) + 1;
  idArray.splice(-1, 1, nextId);
  return idArray.join('-');
};
const StyledTextInput = styled(TextInput)`
  ${h1}
`;
const UselessTextInput = props => {
  return (
    <StyledTextInput
      {...props} // Inherit any props passed to it; e.g., multiline, numberOfLines below
      editable
    />
  );
};
export const CreateScreen = ({navigation, route}) => {
  const [contentArray, setContentArray] = useState([
    {id: 'local-1-1', value: 'test'},
    {id: 'local-2-1', value: 'test'},
  ]);
  console.log('contentArray', contentArray);
  const textChange = (text, id) => {
    const nextContentArray = [...contentArray];
    // const nextId = getNewId(id);
    nextContentArray[0] = {id, value: text};
    setContentArray(nextContentArray);
    // for test
    const textArray = text.split('\n');
    textArray.map(eachLine => {
      const singleLineArray = eachLine.split(' ');
    });
  };
  return (
    <View>
      {contentArray.map(item => {
        const {id, value} = item;
        console.log('render id', id);
        return (
          <UselessTextInput
            multiline
            key={id}
            onChangeText={text => textChange(text, id)}
            value={value}
          />
        );
      })}
    </View>
  );
};
