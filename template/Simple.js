import React from 'react'
import Header from '../components/Header'
const simple = (props) => {
    const {children} =props
    return (
        <>
            <Header/>
            {children}
        </>
    )
}

export default simple
