import React from "react";
import styled from "styled-components";

import DropdownHandle from "./DropdownHandle";

type Props = {
  total: number;
};

const Wrapper = styled.div`
  // clear: both;
  // overflow: auto;
  display: grid;
  grid-template-columns: auto auto;
  border-top: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  padding-top: 5px;
  padding-bottom: 5px;

  > div {
    display: flex;
    align-items: center;
  }

  > div:last-child {
    justify-content: flex-end;
  }

  > div > div {
    display: inline-block;
  }

  div.tags {
    margin-left: 1em;
  }
`;

const ImageContainerHeader = ({ total = 0 }) => {
  return (
    <Wrapper>
      <div>
        <div>
          <DropdownHandle label="Display Options" />
        </div>
        <div className="tags">Tags</div>
      </div>
      <div>
        <div className="total">
          Viewing <strong>{total.toLocaleString()} samples</strong>
        </div>
      </div>
    </Wrapper>
  );
};

export default ImageContainerHeader;
