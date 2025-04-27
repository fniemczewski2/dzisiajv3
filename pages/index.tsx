import React from "react";
import type { GetServerSideProps } from "next";

const IndexPage: React.FC = () => {
  return <></>;
};

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/tasks",
      permanent: false,
    },
  };
};

export default IndexPage;
