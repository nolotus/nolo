import React from 'react'
import {useSelector} from "react-redux" 

import Simple from './Simple'
const index = () => {
const templateName = useSelector(state => state.templateName)
switch (templateName) {
    case 'simple':
        return <Simple></Simple>

    default:
        return <Simple></Simple>
}
}

export default index
