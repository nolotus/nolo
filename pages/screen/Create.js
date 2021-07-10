import React, {useState} from 'react';
import {View, TextInput} from 'react-native';
import styled from 'styled-components';
import {h1, h2} from '../../common/text';
const styleConfig = new Map([
  ['heading-one', h1],
  ['heading-two', h2],
]);
// const getNewId = id => {
//   console.log('id', id);
//   const idArray = id.split('-');
//   const nextId = Number(idArray[idArray.length - 1]) + 1;
//   idArray.splice(-1, 1, nextId);
//   return idArray.join('-');
// };
const StyledTextInput = styled(TextInput)`
  ${props => styleConfig.get(props.type)};
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
  const keyChange = ({nativeEvent}) => {
    console.log(nativeEvent, nativeEvent);
  };
  const textChange = (text, id) => {
    const nextContentArray = [...contentArray];
    // const nextId = getNewId(id);
    const index = nextContentArray.findIndex(item => item.id === id);
    nextContentArray[index] = {id, value: text};
    // for test
    const textArray = text.split('\n');
    textArray.map(eachLine => {
      const singleLineArray = eachLine.split(' ');
      console.log('singleLineArray', singleLineArray);
      if (singleLineArray[0] && singleLineArray.length > 1) {
        switch (singleLineArray[0]) {
          case '#':
            nextContentArray[index] = {id, value: text, type: 'heading-one'};
            break;
          case '##':
            nextContentArray[index] = {id, value: text, type: 'heading-two'};
            break;
          case '###':
            nextContentArray[index] = {id, value: text, type: 'heading-three'};
            break;
          case '####':
            nextContentArray[index] = {id, value: text, type: 'heading-four'};
            break;
          case '1.':
            nextContentArray[index] = {id, value: text, type: 'heading-one'};
            break;
          default:
            break;
        }
      }
    });
    setContentArray(nextContentArray);
  };
  return (
    <View>
      {contentArray.map(item => {
        const {id, value, type} = item;
        return (
          <UselessTextInput
            multiline
            key={id}
            onChangeText={text => textChange(text, id)}
            onKeyPress={keyChange}
            value={value}
            type={type}
          />
        );
      })}
    </View>
  );
};
