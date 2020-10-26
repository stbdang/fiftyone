import { remote, ipcRenderer } from "electron";
import React, { ReactNode, useState, useEffect, useRef } from "react";
import ReactGA from "react-ga";
import { Button, Modal } from "semantic-ui-react";
import { useRecoilState, useSetRecoilState } from "recoil";
import { ErrorBoundary } from "react-error-boundary";
import NotificationHub from "../components/NotificationHub";

import Header from "../components/Header";
import PortForm from "../components/PortForm";
import { updatePort } from "../actions/update";

import { updateState, updateConnected, updateLoading } from "../actions/update";
import { useHashChangeHandler } from "../utils/hooks";
import { getSocket, useSubscribe } from "../utils/socket";
import connect from "../utils/connect";
import { DialogContextProvider, DialogPlaceholder } from "../utils/dialog";
import { convertSelectedObjectsListToMap } from "../utils/selection";
import {
  stateDescription,
  selectedSamples,
  selectedObjects,
  viewCounter,
} from "../recoil/atoms";
import gaConfig from "../constants/ga.json";
import Error from "./Error";

type Props = {
  children: ReactNode;
};

function App(props: Props) {
  const [showInfo, setShowInfo] = useState(true);
  const addNotification = useRef(null);
  const [reset, setReset] = useState(false);
  const { loading, children, dispatch, connected, port } = props;
  const portRef = useRef();
  const [result, setResultFromForm] = useState({ port, connected });
  const [socket, setSocket] = useState(getSocket(result.port, "state"));
  const setStateDescription = useSetRecoilState(stateDescription);
  const setSelectedSamples = useSetRecoilState(selectedSamples);
  const setSelectedObjects = useSetRecoilState(selectedObjects);
  const [viewCounterValue, setViewCounter] = useRecoilState(viewCounter);

  const handleStateUpdate = (data) => {
    setStateDescription(data);
    setSelectedSamples(new Set(data.selected));
    setSelectedObjects(convertSelectedObjectsListToMap(data.selected_objects));
    dispatch(updateState(data));
  };

  const [gaInitialized, setGAInitialized] = useState(false);
  useEffect(() => {
    const dev = process.env.NODE_ENV == "development";
    const buildType = dev ? "dev" : "prod";
    socket.emit("get_fiftyone_info", (info) => {
      ReactGA.initialize(gaConfig.app_ids[buildType], {
        debug: dev,
        gaOptions: {
          storage: "none",
          cookieDomain: "none",
          clientId: info.user_id,
        },
      });
      ReactGA.set({
        userId: info.user_id,
        checkProtocolTask: null, // disable check, allow file:// URLs
        [gaConfig.dimensions.dev]: buildType,
        [gaConfig.dimensions.version]: info.version,
      });
      setGAInitialized(true);
      ReactGA.pageview(window.location.hash.replace(/^#/, ""));
    });
  }, []);
  useHashChangeHandler(() => {
    if (gaInitialized) {
      ReactGA.pageview(window.location.hash.replace(/^#/, ""));
    }
  });
  useSubscribe(socket, "connect", () => {
    dispatch(updateConnected(true));
    if (loading) {
      socket.emit("get_current_state", "", (data) => {
        handleStateUpdate(data);
        dispatch(updateLoading(false));
      });
    }
  });
  if (socket.connected && !connected) {
    dispatch(updateConnected(true));
    dispatch(updateLoading(true));
    socket.emit("get_current_state", "", (data) => {
      setViewCounter(viewCounterValue + 1);
      handleStateUpdate(data);
      dispatch(updateLoading(false));
    });
  }
  setTimeout(() => {
    if (loading && !connected) {
      dispatch(updateLoading(false));
    }
  }, 250);
  useSubscribe(socket, "disconnect", () => {
    dispatch(updateConnected(false));
  });
  useSubscribe(socket, "update", (data) => {
    setViewCounter(viewCounterValue + 1);
    if (data.close) {
      remote.getCurrentWindow().close();
    }
    handleStateUpdate(data);
  });

  useSubscribe(socket, "notification", (data) => {
    addNotification.current(data);
  });

  useEffect(() => {
    if (reset) {
      socket.emit("get_current_state", "", (data) => {
        handleStateUpdate(data);
        dispatch(updateLoading(false));
      });
    }
  }, [reset]);

  ipcRenderer.on("update-session-config", (event, message) => {
    portRef.current.ref.current.click();
  });
  const bodyStyle = {
    padding: "0 2rem 2rem 2rem",
  };

  return (
    <ErrorBoundary
      FallbackComponent={Error}
      onReset={() => setReset(true)}
      resetKeys={[reset]}
    >
      <Header />
      <div className={showInfo ? "" : "hide-info"} style={bodyStyle}>
        <DialogContextProvider>
          {children}
          <DialogPlaceholder />
          {/* todo: migrate modal below to dialog */}
          <Modal
            trigger={
              <Button
                style={{ padding: "1rem", display: "none" }}
                ref={portRef}
              ></Button>
            }
            size="tiny"
            onClose={() => {
              dispatch(updatePort(result.port));
              setSocket(getSocket(result.port, "state"));
            }}
          >
            <Modal.Header>Port number</Modal.Header>
            <Modal.Content>
              <Modal.Description>
                <PortForm
                  setResult={setResultFromForm}
                  connected={connected}
                  port={port}
                  invalid={false}
                />
              </Modal.Description>
            </Modal.Content>
          </Modal>
        </DialogContextProvider>
      </div>
      <NotificationHub children={(add) => (addNotification.current = add)} />
    </ErrorBoundary>
  );
}

export default connect(App);
