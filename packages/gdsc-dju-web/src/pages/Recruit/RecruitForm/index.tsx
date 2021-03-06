import { addDoc, collection } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import React, { memo, useLayoutEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FieldValues } from 'react-hook-form/dist/types/fields';
import { createSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useRecoilState } from 'recoil';
import { recruitInfo } from '../../../pageData/recruitInfo';
import FileInput from '../../../components/common/input/FileInput';
import { StyledTextArea } from '../../../components/common/input/TextArea/styled';
import {
  ErrorBox,
  StyledInput,
} from '../../../components/common/input/TextInput/styled';
import ApplyModal from '../../../components/common/Modal/ApplyModal';
import ReactHelmet from '../../../components/common/ReactHelmet';
import { SubTitle, Title } from '../../../components/common/Title/title';
import { formValidation } from '../../../components/Validation/recuitForm';
import { db } from '../../../firebase/firebase';
import { storage } from '../../../firebase/firebase.config';
import { alertState } from '../../../store/alert';
import { loaderState } from '../../../store/loader';
import { MODAL_KEY, modalState } from '../../../store/modal';
import { ContainerInner, LayoutContainer } from '../../../styles/layouts';
import {
  IApplicantParams,
  IInputRegister,
  IRegisterApplicantType,
} from '../../../types/applicant';
import { FormValue } from '../../../types/recruitForm';
import { isObjEmpty } from '../../../utils/objectCheck';
import { positionSelect } from './FormFunctions';
import {
  FormContentWrapper,
  FormLabel,
  FormMargin,
  FormMarginXS,
  FormSubmitButton,
  FormText,
  RecruitFormInner,
  RecruitFormWrapper,
} from './styled';

const RecruitForm = () => {
  const { id } = useParams();
  const [position, setPosition] = useState('');
  const [loading, setLoading] = useRecoilState(loaderState);
  const [modal, setModal] = useRecoilState(modalState);
  const [alert, setAlert] = useRecoilState(alertState);
  const [file, setFile] = useState<null | File>(null);
  const navigate = useNavigate();
  const [data, setData] = useState<null | IInputRegister>(null);

  const { register, handleSubmit, watch, formState } = useForm<FormValue>({
    mode: 'onChange',
  });
  const { errors } = formState;

  const checkFile = (file: File | null, size: number, type: string) => {
    if (file) {
      if (file.size > size) {
        setAlert({
          ...alert,
          alertMessage: `????????? ?????? ???????????? ${Math.floor(
            size / 1000000,
          )}MB ????????? ??????????????????.`,
          alertStatus: 'error',
          alertHandle: true,
        });
      } else if (file.type !== type) {
        const typeName = type.replace('application/', '');
        setAlert({
          ...alert,
          alertMessage: `${typeName} ????????? ????????? ???????????????.`,
          alertStatus: 'error',
          alertHandle: true,
        });
        return;
      } else {
        return file;
      }
      return;
    }
  };

  const uploadFiles = async (file: File) => {
    const checkedFile = checkFile(file, 50000001, 'application/pdf');
    if (checkedFile instanceof File) {
      const storageRef = ref(storage, `${checkedFile.name}`);
      await uploadBytesResumable(storageRef, file);
      return await getDownloadURL(storageRef);
    }
  };
  const onRegister = async () => {
    const recruitItem: IRegisterApplicantType = {
      ...(data as IInputRegister),
      status: 'DOCS',
      generation: recruitInfo.GENERATION,
      uploadDate: new Date(),
      position: position,
    };
    setLoading({ ...loading, load: true });
    setModal({ ...modal, [MODAL_KEY.APPLY_CHECK]: false });
    try {
      if (file) {
        const url = await uploadFiles(file);
        await addDoc(collection(db, recruitInfo.COLLECTION), {
          ...recruitItem,
          fileURL: url,
        });
      } else {
        await addDoc(collection(db, recruitInfo.COLLECTION), {
          ...recruitItem,
          fileURL: null,
        });
      }
      navigate({
        pathname: '/recruit/apply-success',
        search: `?${createSearchParams(
          params as Record<string, string | string[]>,
        )}`,
      });
      setLoading({ ...loading, load: false });
    } catch (e) {
      setAlert({
        ...modal,
        alertMessage: '????????? ????????? ????????????.',
        alertStatus: 'error',
        alertHandle: true,
      });
      setLoading({ ...loading, load: false });
    }
  };

  const isBlocked = !(
    watch('name') &&
    watch('email') &&
    watch('major') &&
    watch('phoneNumber') &&
    watch('studentID') &&
    watch('question1') &&
    watch('question2') &&
    watch('question3') &&
    watch('question4') &&
    watch('question5')
  );
  const onSubmit = (values: FieldValues) => {
    setData(JSON.parse(JSON.stringify(values)));
    isObjEmpty(errors) && setModal({ ...modal, [MODAL_KEY.APPLY_CHECK]: true });
  };

  const params = {
    name: data?.name,
    position: position,
    email: data?.email,
    phoneNumber: data?.phoneNumber,
  };
  useLayoutEffect(() => {
    setPosition(positionSelect[id as keyof typeof positionSelect]);
  }, [id]);
  const formElements = Object.keys(formValidation) as Array<
    keyof typeof formValidation
  >;

  return (
    <>
      <ApplyModal {...(params as IApplicantParams)} onClick={onRegister} />
      <LayoutContainer>
        <ContainerInner>
          <FormMargin />
          <FormMargin />
          <form onSubmit={handleSubmit(onSubmit)}>
            <RecruitFormWrapper>
              <RecruitFormInner>
                <Title>????????? ????????????</Title>
                <SubTitle>{position}</SubTitle>
                <FormMargin />
                {formElements.map((element) => {
                  const elementName = formValidation[element];
                  const isRequired = elementName.required.value;
                  return (
                    <FormContentWrapper key={element}>
                      <FormLabel essential={isRequired}>
                        {elementName.label}
                      </FormLabel>
                      {elementName.text && (
                        <FormText>{elementName.text}</FormText>
                      )}
                      {elementName.type === 'INPUT' ? (
                        <StyledInput
                          error={!!errors[element]}
                          placeholder={elementName.placeholder}
                          {...register(element, elementName)}
                        />
                      ) : elementName.type === 'TEXT_AREA' ? (
                        <StyledTextArea
                          placeholder={elementName.placeholder}
                          error={!!errors[element]}
                          {...register(element, elementName)}
                        />
                      ) : (
                        <p>
                          {elementName.notice?.split('\n').map((text) => (
                            <FormText key={text}>{text}</FormText>
                          ))}
                        </p>
                      )}
                      <ErrorBox>
                        {!!errors[element] &&
                          (errors[element]?.message as string)}
                      </ErrorBox>
                    </FormContentWrapper>
                  );
                })}
                <FormContentWrapper>
                  <FormLabel essential={false}>
                    ???????????? ??? ???????????? ????????? ????????? ??????????????????
                  </FormLabel>
                  <FileInput
                    defaultPlaceholder={'PDF??? ????????? ????????????!'}
                    accept={'application/pdf, .pdf'}
                    onChange={(e) =>
                      setFile(e.target.files && e.target.files[0])
                    }
                  />
                  <FormText>
                    * ????????? ?????? 50MB??? ????????? ?????? ??? ????????????.
                  </FormText>
                </FormContentWrapper>
                <FormMarginXS />
                <FormMargin />
                {!isBlocked ? (
                  <FormSubmitButton type={'submit'} onClick={onSubmit}>
                    ????????????
                  </FormSubmitButton>
                ) : (
                  <FormSubmitButton type={'button'} disable={isBlocked}>
                    ????????????
                  </FormSubmitButton>
                )}
                <FormMargin />
              </RecruitFormInner>
            </RecruitFormWrapper>
          </form>
        </ContainerInner>
      </LayoutContainer>
    </>
  );
};

export default memo(RecruitForm);
